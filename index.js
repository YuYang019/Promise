let uid = 0

// 这个函数中间的部分不是很懂，作用应该是兼容不同第三方Promise的
function resolvePromise(promise2, x, resolve, reject) {
  let then
  let thenCalledOrThrow = false

  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise!'))
  }

  if (x instanceof Promise) {
    if (x.status === 'pending') { //because x could resolved by a Promise Object
      x.then(function(v) {
        resolvePromise(promise2, v, resolve, reject)
      }, reject)
    } else { //but if it is resolved, it will never resolved by a Promise Object but a static value;
      x.then(resolve, reject)
    }
    return
  }

  if ((x !== null) && ((typeof x === 'object') || (typeof x === 'function'))) {
    try {
      then = x.then //because x.then could be a getter
      if (typeof then === 'function') {
        then.call(x, function rs(y) {
          if (thenCalledOrThrow) return
          thenCalledOrThrow = true
          return resolvePromise(promise2, y, resolve, reject)
        }, function rj(r) {
          if (thenCalledOrThrow) return
          thenCalledOrThrow = true
          return reject(r)
        })
      } else {
        resolve(x)
      }
    } catch (e) {
      if (thenCalledOrThrow) return
      thenCalledOrThrow = true
      return reject(e)
    }
  } else {
    resolve(x)
  }
}

class Promise {
  constructor(executor) {
    this.uid = uid++
    this.data = null
    this.status = 'pending'
    this.onResolvedCallback = []
    this.onRejectedCallback = []

    const resolve = (value) => {
      if (value instanceof Promise) {
        return value.then(resolve, reject)
      }

      /**为什么要异步？举个例子
       * 
       * let isFulfilled = false;
       * 
       * let d = new Promise(function(resolve, reject) {
       *   setTimeout(function() {
       *     resolve(2);
       *     isFulfilled = true;
       *   }, 50);
       * });
       * 
       * d.then(function onFulfilled() {
       *   console.log(isFulfilled == true)
       * });
       * 
       * 此时then里的判断为false，isFulfilled没有及时改变
       */
      setTimeout(() => {
        if (this.status === 'pending') {
          this.status = 'resolved'
          this.data = value
          this.onResolvedCallback.forEach(fn => {
            fn(value)
          })
        }
      }, 0)
    }

    const reject = (reason) => {
      setTimeout(() => {
        if (this.status === 'pending') {
          this.status = 'rejected'
          this.data = reason
          this.onRejectedCallback.forEach(fn => {
            fn(reason)
          })
        }
      }, 0)
    }

    try {
      executor(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  then(onResolved, onRejected) {
    let promise2

    onResolved = typeof onResolved === 'function' ? onResolved : function(v) { return v }
    onRejected = typeof onRejected === 'function' ? onRejected : function(r) { throw r }

    if (this.status === 'resolved') {
      return promise2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            let x = onResolved(this.data)
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      })
    }

    if (this.status === 'rejected') {
      return promise2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            let x = onRejected(this.data)
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      })
    }

    if (this.status === 'pending') {
      return promise2 = new Promise((resolve, reject) => {

        this.onResolvedCallback.push((value) => {
          setTimeout(() => {
            try {
              let x = onResolved(value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (err) {
              reject(err)
            }
          }, 0)
        })

        this.onRejectedCallback.push((reason) => {
          setTimeout(() => {
            try {
              let x = onRejected(reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (err) {
              reject(err)
            }
          }, 0)
        })
      })
    }
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  finally(callback) {
    let P = Promise
    return this.then(
      value => P.resolve(callback()),
      reason => P.resolve(callback())
    )
  }
}

Promise.resolve = function(value) {
  return new Promise((resolve, reject) => { resolve(value) })
}

Promise.reject = function(value) {
  return new Promise((resolve, reject) => { reject(value) })
}

Promise.all = function(array /* [p1, p2, ...] */) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(array)) {
      return reject(new TypeError('arguments must be a array'))
    }
    let count = 0
    const length = array.length
    const resolvedVal = []
    for (let i = 0; i < length; i++) {
      Promise.resolve(array[i]).then((val) => {
        count++
        resolvedVal[i] = val
        if (count === length) {
          return resolve(resolvedVal)
        }
      }, (reason) => {
        return reject(reason)
      })
    }
  })
}

Promise.race = function(array /* [p1, p2, ...] */) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(array)) {
      return reject(new TypeError('arguments must be a array'))
    }
    const length = array.length
    for (let i = 0; i < length; i++) {
      Promise.resolve(array[i]).then(val => {
        resolve(val)
      }, (reason) => {
        reject(reason)
      })
    }
  })
}

// test Promise.finally
const p = new Promise((rs, rj) => {
  rs(1)
})
.then(val => {
  throw val
  return 3
})
.then(val => {
  console.log(val)
  return val
})
.catch(e => {
  console.log(e)
})
.then(val => {
  console.log(val)
})
.finally(() => {
  console.log('aaaa')
})

// test Promise.all and Promise.race
const p1 = new Promise((rs, rj) => {
  setTimeout(() => {
    rs(1)
  }, 1000)
})

const p2 = new Promise((rs, rj) => {
  setTimeout(() => {
    rs(2)
  }, 2000)
})

const p3 = new Promise((rs, rj) => {
  setTimeout(() => {
    rs(3)
  }, 2000)
})

const p4 = new Promise((rs, rj) => {
  setTimeout(() => {
    rj(4)
  }, 500)
})


Promise.all([p1, p2, p3]).then(val => {
  console.log(val)
}).catch(err => {
  console.log(err)
})

Promise.race([p1, p2, p3, p4]).then(val => {
  console.log(val)
}).catch(err => {
  console.log(err)
})


// use promises-aplus-tests to test Promise
Promise.deferred =  Promise.defer = function() {
  const dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

try {
  module.exports = Promise
} catch (e) {}


