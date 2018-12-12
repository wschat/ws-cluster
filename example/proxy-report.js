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
    for(let i=0;i<counts;i++){
        let worker=cluster.fork()
        workers.push(worker)
    }
    if(workers.length===counts){
        // 设置一个属性到worker 0 上
        workers[0].send({
            type:'set',
            key:'setW0Name',
            value:'这是设置在worker0的值',
        });

        // 监听来自worker的消息
        app.on('message',(data,workerId )=>{
            console.log(`message(worker ${workerId}):`,data)
        })
        
        // 通常同步属性延迟在 100 ~ 200ms 之间
        console.log('master property(before): ',app.setW0Name)
        setTimeout(_=>{
            console.log('master property(after): ',app.setW0Name)
            workers[1].send({
                type:'get',
                key:'setW0Name'
            });

        },120)
        
    }
}else{
    
    // 这里的 app 是 worker 中的 app
    process.on('message',data=>{
        if(data.type==='get'){
            if(data.key){
                let message=app[data.key]||'undefined';
                process.send(message)
            }
        }else if(data.type==='set'){
            if(data.key){
                app[data.key]=data.value;
            }
            
        }
        
    })
    
}