const cluster=require('cluster')
const http=require('http')
const os=require('os')
var Master=require('./src/cluster')
var counts=os.cpus().length;
var port=3001

var app=new Master();
app.on('masterStart',w=>{
    console.log('start....')
    for(let i =0 ;i<counts;i++){
        cluster.setupMaster({
            args: ['--ii', 'index:'+i],
        });
        app.fork();
    }
})

app.on('fork',(worker,master)=>{
    console.log(worker.id)
})
app.on('workerStart',(worker)=>{
    console.count('workerStart')
    console.log(process.argv.pop())
    port+=parseInt(worker.id)
    // if(port===3002){
    //     setTimeout(_=>{
    //         console.log('port:3002')
    //         app.reload(worker.id);
    //    },3000)
    // }
    http.createServer((req,res)=>{
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(port.toString());
    }).listen(port)
    
})
app.on('reloadStart',(workers)=>{
    console.count('reloadStart')
})
app.on('workerRealoadSuccess',(worker)=>{
    console.count('workerRealoadSuccess')
})
app.on('workerClose',(worker)=>{
    console.count('worker close')
})
app.on('message',(msg,worker)=>{
    console.log('message',msg,worker)
})
app.run();
// setTimeout(_=>{
//     app.reload();
// },8000)
