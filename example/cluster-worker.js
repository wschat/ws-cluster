// 这里是子进程逻辑
const http=require('http')

let argv = process.argv,
    port = parseInt(argv.pop()),
    type = argv.pop();

const app=http.createServer((req,res)=>{
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('listen port：'+ port);
})

// 如果有tcp等监听 则 master 会触发 ‘workerListening’事件
app.listen(port)
