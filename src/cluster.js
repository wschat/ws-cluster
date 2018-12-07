const path = require('path')
const cluster = require('cluster')
const assert = require('assert').strict
const { EventEmitter } = require('events')

const get_worker_fun = Symbol('_getWorker');
const init_fun = Symbol('init');
const master_fun = Symbol('master');
const worker_fun = Symbol('worker');
const worker_bind_fun = Symbol('worker_bind');

const WORKER_REALOD = Symbol('worker_realod');
const WORKER_FORK_SIGNAL = 'worker_fork_signal';
const WORKER_RELOAD_SIGNAL = 'worker_reload_signal';

module.exports = class Main extends EventEmitter {
    constructor() {
        super();
        this.forkCounts = 0;
        this.listeningCounts = 0;
    }
    /**
     * 启动
     */
    run() {
        if (cluster.isMaster) {
            this[master_fun]();
        } else {
            this[worker_fun]();
        }
    }

    /**
     * fork一个新的进程
     * @param {object} env 用于修改默认'fork' 行为，以Key/value对的形式。
     * @param {boolean} reload 是否重启操作
     */
    fork(env = {}, reload) {
        if (cluster.isMaster) {
            cluster.setupMaster(env);
            let worker = cluster.fork();
            worker.env = env;
            this.forkCounts++;
            this[worker_bind_fun](worker);
            if (reload) {
                this.emit('workerRealoadSuccess', worker)
            }
            return worker;
        } else {
            process.send({ signal: WORKER_FORK_SIGNAL, env })
        }

    }
    /**
     * 关闭进程
     * @param {object} worker 子进程的实例 或 undefined
     */
    close(worker, reload = false) {
        if (worker) {
            this.emit('reload', worker);
            worker = this[get_worker_fun](worker);
            if (reload) {
                worker[WORKER_REALOD] = true;
            }
            worker.process.kill('SIGINT');
        } else {
            this.emit('kill');
            process.kill(process.pid, 'SIGINT');
        }
        this.emit('workerClose', worker);
    }
    /**
     * 重启子进程
     * @param {mixed} workerId 
     */
    reload(workerId) {
        if (cluster.isMaster) {
            let workers = [];
            if (workerId) {
                if (Array.isArray(workerId)) {
                    workers = workerId;
                } else if (typeof workerId === 'object') {
                    workers = [workerId];
                } else {
                    workers = this[get_worker_fun](workerId);
                    if (workers === workerId) {
                        return;
                    }
                    workers = [workers];
                }
            } else {
                workers = cluster.workers;
            }

            for (let i in workers) {
                if (!workers[i]) continue;
                this.close(workers[i], true);
            }
        } else {
            process.send({ signal: WORKER_RELOAD_SIGNAL, workerId })
        }
    }

    /**
     * 通过子进程ID获取子进程实例
     * @param {string} worker 
     */
    [get_worker_fun](worker) {
        if (worker && cluster.isMaster && typeof worker !== 'object') {
            if (typeof worker !== 'string') {
                worker = worker.toString();
            }
            worker = cluster.workers[worker];

        }
        return worker;
    }

    /**
     * 主进程开始
     */
    [master_fun]() {
        this[init_fun]();
        this.emit('masterStart');
    }

    /**
     * 子进程开始
     */
    [worker_fun]() {
        this[init_fun]();
        this.emit('workerStart', cluster.worker)
    }

    /**
     * 进程初始化
     */
    [init_fun]() {
        process.on('uncaughtException', (err) => {
            this.emit('error', err, cluster.isMaster ? undefined : cluster.worker)
            console.log(err)
        });
    }

    /**
     * 初始化绑定子进程事件
     * @param {object} worker 子进程实例
     */
    [worker_bind_fun](worker) {
        worker.on('message', (data) => {
            if (!data) return;
            switch (data.signal) {
                case WORKER_FORK_SIGNAL:
                    this.fork(data.env, true);
                    break;
                case WORKER_RELOAD_SIGNAL:
                    this.fork();
                    break;

                default:
                    this.emit('message', data, worker);
                    break;
            }
        });
        worker.once('listening', (address) => {
            this.listeningCounts++;
            worker.port = address.port;
            this.emit('workerListening', address, worker)
        });
        worker.on('error', (err) => {
            this.emit('error', err, worker)
            this.reload([worker]);
        });
        worker.once('exit', (message) => {
            if (worker[WORKER_REALOD]) {
                this.fork(worker.env, true);
            }
        });
    }
}