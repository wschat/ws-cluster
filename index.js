const {proxy,events} = require('./src/proxy')
const cluster=require('cluster')
const counts=require('os').cpus().length
const fs=require('fs')

class Obj extends events{}
const app=proxy(Obj);
if(cluster.isMaster){
    app.on('workerEvent',data=>{
        console.log('workerEvent',data)
    })
    const workers=[]
    for(let i=0;i<counts;i++){
        let worker=cluster.fork()
        workers.push(worker)
        worker.on('message',data=>{
            if(data.signal){
                app.onMessage(data,worker.id)
                return;
            }
            console.log(`来源：worker${i}：`,data)
        })
    }
    if(workers.length===counts){
        app.myName='这是设置在master上的值';
        workers[0].send({
            type:'set',
            key:'setW0Name',
            value:'这是设置在worker0的值',
        });
        workers[3].send({
            type:'get',
            key:'myName'
        });
        // setTimeout(_=>{
        //     console.log(app.setW0Name)
        
        //     workers[3].send({
        //         type:'get',
        //         key:'setW0Name'
        //     });
        // },100)
        
    }
}else{
    
    process.on('message',data=>{
        if(data.signal){
            app.onMessage(data)
            return;
        }else if(data.type==='get'){
            if(data.key&&app[data.key]){
                process.send(app[data.key])
            }
        }else if(data.type==='set'){
            app.emit('workerEvent','触发于worker的event')
            if(data.key){
                app[data.key]=data.value;
            }
            
        }
        
        
        
    })
    
}