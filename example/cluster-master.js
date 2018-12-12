const {cluster:WScluster}=require('../index')
const path=require('path')
const counts=require('os').cpus().length;
var port=3001
const master = new WScluster();
console.log('start。。。。')
// 主进程开始
master.once('masterStart', () => {
    console.log('masterStart')
    for (let i=0 ; i< counts ; i++) {
        // worker可通过 process.argv 获取到 需要传递的变量
        let env = {
            exec: path.join(__dirname, './cluster-worker'),
            args: ['type',port+i],
        }
        let worker=master.fork(env); // 此处切勿使用 var 代替 let （由于变量的提升会出现不实的结果）
        if(i==1||i==2){
            setTimeout(_=>{
                console.log('re___________________',port+i)
                master.reload(worker.id);
            },1000)
        }
        
    }
    
})


// 来自worker的数据
master.on('message', (data,worker) => {
    console.log('message',data)
})

// 每一次worker端口监听完成
master.on('workerListening', (address, worker) => {
    console.log(`workerListening`, address,worker.port)
    if (master.listeningCounts === master.forkCounts) {
        if (master.listened){
            console.log('重启后 完成所有监听!')
        }else{
            master.listened=true;
            console.log('首次监听启动完成所有worker!')
        }
    }
})
// worker即将重启
master.on('reload',worker=>{
    console.log('reload')
})
// worker关闭时 即使是重启的worker 
master.on('workerClose',worker=>{
    console.log('workerClose')
})

// 每一个worker启动成功时
master.on('workerRealoadSuccess',worker=>{
    console.log('workerRealoadSuccess')
})

// 重启所有
// setTimeout(_=>{
//     master.reload();
// },4000)
master.run();