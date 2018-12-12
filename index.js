const {proxy,events} = require('./src/proxy')
const cluster=require('cluster')
const counts=require('os').cpus().length
const fs=require('fs')

class Obj extends events{}
const App=proxy(Obj);
const app=new App({});
if(cluster.isMaster){
    const workers=[]
    app.on('workerEvent',data=>{
        console.log(data)
    })
    for(let i=0;i<counts;i++){
        let worker=cluster.fork()
        workers.push(worker)
    }
    if(workers.length===counts){
        app.myName='这是设置在master上的值';
        app.on('message',(data,workerId )=>{
            console.log('message:',data)
        })
        workers[0].send({
            type:'event',
        });
        workers[0].send({
            type:'set',
            key:'setW0Name',
            value:'这是设置在worker0的值',
        });
        
        
        setTimeout(_=>{
            console.log(app.setW0Name)
            workers[3].send({
                type:'get',
                key:'setW0Name'
            });
            workers[3].send({
                type:'get',
                key:'myName'
            });

            delete app.setW0Name;
            
            setTimeout(_=>{
                workers[3].send({
                    type:'get',
                    key:'setW0Name'
                });
            },120)
        },120)
        
    }
}else{
    
    process.on('message',data=>{
        if(data.signal){
            return;
        }else if(data.type==='event'){
            app.on('workerEvent',data=>{
                process.send(data)
            })
        }else if(data.type==='get'){
            
            if(data.key){
                let message=app[data.key]||'undefined';
                process.send(message)
            }
        }else if(data.type==='set'){
            app.emit('workerEvent','触发于worker的event')
            if(data.key){
                app[data.key]='data.value';
            }
            
        }
        
        
        
    })
    
}