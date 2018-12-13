# ws-cluster-proxy
<br>

## 介绍

```cluster```的封装、提供父子进程间的基本数据的共享以及```EventEmitter```事件的共享

<br>

## cluster 类
* 多进程管理类
* [实例参考](./example/cluster-master.js)

<br>

### new cluster(void)
    
```
const WsCluster=require('ws-cluster-proxy')
const master=new WsCluster.cluster();

```
#### master 属性

* ```forkCounts``` fork总数
* ```listeningCounts``` 已经进行端口监听的worker总数

#### master 事件

* ```masterStart``` master开始启动时触发 参数：无

```
master.once('masterStart', () => {
    // let env = {
    //     exec: path.join(__dirname, './worker'),
    //     args: ['type','port'],
    // }
    // let worker=master.fork(env);
})
```

* ```workerListening``` 每一次worker端口监听完成时触发 参数：(address, worker)
    * address [server.address()](http://nodejs.cn/api/net.html#net_server_address)
    * worker [cluster worker](http://nodejs.cn/api/cluster.html#cluster_class_worker)
        * ```worker```扩展属性一：```port``` 仅在执行```tcp```等端口监听后存在
        * ```worker```扩展属性二：```env```  ```master.fork(env)```中的```env```参数

```
// 每一次worker端口监听均会触发
master.on('workerListening', (address, worker) => {
    console.log(address,worker.port)
    if (master.listeningCounts === master.forkCounts) {
        if (master.listened){
            console.log('完成所有监听(重启)!')
        }else{
            master.listened=true;
            console.log('首次监听启动完成所有worker!')
        }
    }
})
```

* ```reload``` 每个worker即将重启的一个信号 参数：(worker)

```
// worker即将重启
master.on('reload',worker=>{
    console.log('当前准备重启的worker',worker)
})
```

* ```workerClose``` worker关闭时 参数：(worker)

```
// worker关闭时 即使是重启的worker依然会触发
master.on('workerClose',worker=>{
    console.log('当前关闭的worker',worker)
})
```
* ```workerRealoadSuccess``` 每一个worker重启成功时 参数：(worker)

```
// 每一个worker重启成功时
master.on('workerRealoadSuccess',worker=>{
    console.log('当前重启成功的worker',worker)
})
```

#### master 方法

* ```fork([env])``` [cluster.fork([env]) 的封装](http://nodejs.cn/api/cluster.html#cluster_cluster_fork_env)。通常在```masterStart```事件中使用
    * ```env``` [cluster.setupMaster([settings])参数](http://nodejs.cn/api/cluster.html#cluster_cluster_setupmaster_settings)
* ```reload([workerId])``` worker重启
    * ```workerId``` 取自```worker.id```。 省略重启所有worker 
* ```run()```; 启动master应该在最后面运行（run()方法之后的master操作均是无效的）

<br>

## proxy类、events类 基本属性的同步和事件触发的同步（这两个类必须结合使用）

## events 类 (```events```继承自```EventEmitter```)

* events类对 EventEmitter 上的 emit() 进行了重写，所以需要额外重写emit()应考虑
    

```
const WsCluster=require('ws-cluster-proxy')
class Obj extends WsCluster.events{

}

```

## proxy(class,options)类 该类实现了同步的逻辑

* class最好必须是一个合格的Class或者Function（因为proxy内并未进行class类型验证）

```
// 生成代理类 (注意：Obj最好必须是一个合格的Class或者Function)
const App=proxy(Obj,{
    excludePrefix:'_' //排除代理的属性前缀 默认 '_'
});
// 正常的实例化
const app=new App({/* Obj类所需的初始化参数 */});

```

* 如上```app```已经实现了父子进程间的属性和事件共享。实例请参考：```/example/proxy-*.js```
    * 属性的同步延迟时间由数据大小决定（经试验4个worker的范围）：100~200ms

<br>
<br>