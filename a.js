const cluster = require('cluster');
var a={b:111,c:222}
cluster.setupMaster({
  exec: 'b.js',
  args: ['--use', a],
  silent: true
});
cluster.fork(); 
cluster.on('message',(w,msg)=>{
    console.log(msg)
})