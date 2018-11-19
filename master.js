const cluster=require('cluster')
const assert=require('assert').strict
const {EventEmitter}=require('events')

const get_worker_fun=Symbol('_getWorker');
const init_fun=Symbol('init');
const master_fun=Symbol('master');
const worker_fun=Symbol('worker');
const worker_bind_fun=Symbol('worker_bind');

const WORKER_REALOD=Symbol('worker_realod');
const WORKER_FORK_SIGNAL='worker_fork_signal';
const WORKER_RELOAD_SIGNAL='worker_reload_signal';

module.exports=class Main extends EventEmitter{
    /**
     * 启动
     */
    run(){
        if(cluster.isMaster){
            this[master_fun]();
        }else{
            this[worker_fun]();
        }
    }
    
    /**
     * fork一个新的进程
     * @param {boolean} isReaload 是否重启操作 
     */
    fork(isReaload){
        if(cluster.isMaster){
            let worker=cluster.fork();
            this[worker_bind_fun](worker);
            
            if(isReaload){
                this.emit('workerRealoadSuccess',worker)
            }
        }else{
            process.send({signal:WORKER_FORK_SIGNAL})
        }
        
    }
    /**
     * 关闭进程
     * @param {object} worker 子进程的实例 或 undefined
     */
    close(worker){
        if(worker){
            worker=this[get_worker_fun](worker);
            worker.process.kill('SIGINT');
        }else{
            process.kill('SIGINT');
        }
        this.emit('workerClose',worker);
    }
    /**
     * 重启子进程
     * @param {mixed} workerId 
     */
    reload(workerId){
        if(cluster.isMaster){
            let workers=[];
            if(workerId){
                if(Array.isArray(workerId)){
                    workers=workerId;
                }else if(typeof workerId === 'object'){
                    workers=[workerId];
                }else{
                    workers=this[get_worker_fun](workerId);
                    if(workers===workerId){
                        return;
                    }
                    workers=[workers];
                }
            }else{
                workers=cluster.workers;
            }
            this.emit('reloadStart',workers);
            for(let i in workers){
                let worker=workers[i];
                worker[WORKER_REALOD]=true;
                this.close(worker);
            }
        }else{
            process.send({signal:WORKER_RELOAD_SIGNAL,workerId})
        }
    }

    /**
     * 通过子进程ID获取子进程实例
     * @param {string} worker 
     */
    [get_worker_fun](worker){
        if(worker&&cluster.isMaster&&typeof worker!=='object'){
            if(typeof worker!=='string'){
                worker=worker.toString();
            }
            worker=cluster.workers[worker];
        }
        return worker;
    }

    /**
     * 主进程开始
     */
    [master_fun](){
        this[init_fun]();
        this.emit('masterStart');
    }

    /**
     * 子进程开始
     */
    [worker_fun](){
        this[init_fun]();
        this.emit('workerStart',cluster.worker)
    }

    /**
     * 进程初始化
     */
    [init_fun](){
        process.on('uncaughtException', (err) => {
            this.emit('error',err,cluster.isMaster?undefined:cluster.worker)
        });
    }

    /**
     * 初始化绑定子进程事件
     * @param {object} worker 子进程实例
     */
    [worker_bind_fun](worker){
        worker.on('message',(data)=>{
            if(data&&data.signal===WORKER_FORK_SIGNAL){
                this.fork();
            }else if(data&&data.signal===WORKER_RELOAD_SIGNAL){
                this.reload(data.workerId);
            }else{
                this.emit('message',data,worker)
            }
        });
        worker.on('listening',(address)=>{
            this.emit('workerListening',worker)
            console.log('workerListening',address)
        });
        worker.on('error',(err)=>{
            this.emit('error',err,worker)
            this.reload([worker]);
        });
        worker.on('exit',(message)=>{
            if(worker[WORKER_REALOD]){
                this.fork(true);
            }
        });
    }
}