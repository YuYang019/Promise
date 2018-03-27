# Learn Promise

参考网上教程

[Promise/A+标准](https://promisesaplus.com/#point-46)

几点细节：
1. then和catch总会返回一个全新的Promise对象, 这个新的Promise有自己的resolve, reject, callback队列等等
2. then的回调是异步执行, 实际中是推入micro队列，但是这里就简单地用了setTimeout实现异步

所以，为什么上一个resolve值出去，下一个then里就能接收到？

不同版本实现可能不同，但是在这个版本里，上一个触发resolve，就把自己的onResolvedCallback清空，这个队列里包含的是一个或几个定义好的函数，这个函数主要内容，触发下一个then里的回调，获取回调的值，如果then回调有值，则继续触发then所处Promise的resolve，而这个resolve又会清空自己的onResolvedCallback，这样不断往下运行

为什么then里throw的错误，即使隔了很多个then，能被catch收到？

在某个then里或者说在某个Promise实例里，throw一个错误，会被try catch捕获，然后触发这个Promise实例的reject方法，这个reject会把自己的onRejectedCallback清空，这个队列里包含的是一个或几个定义好的函数，主要内容为，触发下一个then的onReject方法，这个onReject默认就是抛出一个错误，然后这又会被try catch捕获，触发下一个then的reject方法，而这个reject又会清空自己的onRejectedCallback，触发下下个then的onReject，这样不断反复的往下，直到传到catch

当然，如果后面某个then里已经定义了onReject方法，那么就不会传到catch。这一点和原生的行为是一致的

值的穿透？就是then的默认参数就是把值往后传或者抛