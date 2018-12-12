// 同步master类属性到 worker类实例
const {proxy,events}=require('../index')
const cluster=require('cluster')
const counts=require('os').cpus().length

//需代理的类应该继承events events 继承自 EventEmitter 类
class Obj extends events{}
// 生成代理类
const App=proxy(Obj,{
    excludePrefix:'_' //排除代理的属性前缀 默认 '_'
});


const app=new App({/* Obj类所需的初始化参数 */});

if(cluster.isMaster){
    const workers=[]
    // master中event的监听
    app.on('workerEvent',(msg,data)=>{
        console.log(msg,data)
    })
    for(let i=0;i<counts;i++){
        let worker=cluster.fork()
        workers.push(worker)
    }
    if(workers.length===counts){
        // 监听来自worker的消息
        app.on('message',(data,workerId )=>{
            console.log('\n')
            console.log(`message(worker ${workerId}):`,data)
        })

        // 设置一个属性到worker 2 上
        workers[1].send({
            type:'setEvent',
            value:'从worker上触发事件',
        });
        app.emit('masterEvent',{msg:'fork完成之后master中emit'})
    }
}else{
    // 监听worker 1 中emit的事件
    app.on('workerEvent',(msg,data)=>{
        if(cluster.worker.id==2){ // 仅接收查看worker 2 是否同步（可去除）
            process.send({msg,data})
        }
        
    })
    // 监听master中emit的事件
    app.on('masterEvent',(msg,data)=>{
        if(cluster.worker.id==3){ // 仅接收查看worker 3 是否同步（可去除）
            process.send({msg,data})
        }
        
    })
    // 这里的 app 是 worker 中的 app
    process.on('message',data=>{
        if(data.type==='setEvent'){
            app.emit('workerEvent','触发于worker的event',data)
        }
        
    })
    
}