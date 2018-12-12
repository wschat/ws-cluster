const cluster=require('cluster')
const EventEmitter = require('events');
const report_signal = '_WS_report_signal';
const sync_signal = '_WS_sync_signal';
const stopPropagation = Symbol('stopPropagation');
const asyncMessage = Symbol('asyncMessage');
const emitEvents = Symbol('emitEvents');

/**
 * EventEmitter 代理器实现类需继承该类
 */
exports.events = class Events extends EventEmitter{
    constructor(){
        super();
        this[asyncMessage]=false;
    }
    /**
     * 
     * @param {string} event 
     * @param {object} data 触发Events时传输的数据
     * @param {null || object} worker 需要指定触发events的worker
     * @param {null || string || integer} workerId 需要指定触发events的worker的ID
     */
    [emitEvents](event, data, worker, workerId){
        sync({ event, data }, worker, workerId)
        report({event,data})
    }
    emit(event,type,...args){
        if(type!==stopPropagation){
            args.unshift(type);
            this[emitEvents](event,args);
        }
        super.emit(event,...args)
    }
} 

/**
 * 属性代理器 （代理的属性仅包含非 Symbol的基础类型属性和 Array , Object 引用类型）
 * @param  {class}  Application 需要代理的类
 * @param  {object} options     代理器配置 {excludePrefix : '排除代理的属性前缀'}
 */
exports.proxy = (Application,options={}) => {
    options=Object.assign({
        excludePrefix:'_'
    },options)
    return new Proxy(Application, {
        construct(target, args, receiver){
            const app= new Proxy(new Application(...args),{
                set(target, key, value, receiver) {
                    if (!Object.is(Reflect.get(target, key), value)) {
                        if (typeof key !== 'symbol' &&key.indexOf(options.excludePrefix) !== 0) {
                            sync({key, value});
                            if(Reflect.get(target, asyncMessage)){
                                Reflect.set(target, asyncMessage, false)
                            }else{
                                report({ key, value });
                            }
                        }
                    }
                    return Reflect.set(target, key, value, receiver)
                },
                deleteProperty(target, key) {
                    if (key!==asyncMessage&&!Object.is(Reflect.get(target, key), undefined)) {
                        sync({ key, value:undefined});
                        report({ key, value: undefined });
                    }
                    return Reflect.deleteProperty(target, key);
                }
            })

            if(cluster.isMaster){
                cluster.on('message',(worker,data)=>{
                    onMessage(app,data,worker.id)
                })
            }else{
                process.on('message',data=>{
                    onMessage(app,data)
                })
            }
            return app;
        },
        

    })
    
    
}

/**
 * 上报信息
 * @param {object} params {key,value} or {event,data}
 */ 
function report(params) {
    if (cluster.isMaster) return;
    process.send({
        signal: report_signal,
        params
    })
}
/**
 * 同步信息
 * @param {object} params {key,value} or {event,data}
 * @param {object} worker 须同步的worker
 * @param {string || integer} excludeId 排除的workerId 
 */
function sync(params, worker,excludeId) {
    if (cluster.isWorker) return;
    if (worker) {
        worker.send({
            signal: sync_signal,
            params
        })
        return;
    }
    let workers = cluster.workers;
    for (let i in workers) {
        if (excludeId==i)continue;
        workers[i].send({
            signal: sync_signal,
            params
        })
    }
}

/**
 * process.on('message',data=>{
 *  this.onMessage(data);
 * })
 * @param {object} data { signal, params }
 * @param {null || string || integer} workerId 接收的worker消息的所属ID
 */
function onMessage(app,data,workerId) {
    let { signal, params }=data;
    if(!signal||!params){
        app.emit('message',stopPropagation,data,workerId)
        return;
    }
    if (signal === report_signal) {
        if (params.event){
            app.emit(params.event,stopPropagation,...params.data);
            app[emitEvents](params.event,params.data,null,workerId)
            return;
        }
        Reflect.set(app, params.key, params.value);
    } else if (signal === sync_signal) {
        if (params.event) {
            app.emit(params.event,stopPropagation, ...params.data);
            return;
        }
        Reflect.set(app, asyncMessage, true);
        Reflect.set(app, params.key, params.value);
    }else{
        app.emit('message',stopPropagation,data,workerId)
    }
}