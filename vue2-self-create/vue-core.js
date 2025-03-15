class Vue {
  // 接受vue的配置，这里暂时接受挂载的根元素和data数据
  constructor(options) {
    this.$data = options.data();

    // 通过defineProperty劫持全部属性的get和set函数。需要靠这个去维护订阅者和开发者。
    observe(this.$data);

    // 根据根元素编译vue自定义指定，这里处理v-model，通过input事件和对元素value赋值实现双向绑定
    new Compile(this.$data, options.el);

    // 将data数据绑定到根元素，使用户访问方便（获取，修改）
    Object.keys(this.$data).forEach(key => {
      Object.defineProperty(this, key, {
        set: (newVal) => {
          console.log('you changed the property:' + key + ' to ' + newVal + ' and the view had refresh');
          this.$data[key] = newVal
        },
        get: () => this.$data[key]
      })
    })
  }
}

// 劫持用户数据，维护发布-订阅模式
const observe = (obj) => {
  Object.keys(obj).forEach(key => {
    // 给值赋一个新变量，防止后续赋值内存溢出
    let value = obj[key];
    // 每个属性都需要一个观察队列
    const dep = new Dep();

    Object.defineProperty(obj, key, {
      get: () => {
        dep.depend();
        return value
      },
      set: (newVal) => {
        if (newVal === value) return;
        value = newVal;
        dep.notify();
      }
    })
  })
}

// 元素编译类，集中处理vue的自定义指令
class Compile {
  constructor(vm, el) {
    this.vm = vm;
    this.el = el;
    this.compile();
  }
  compile() {
    const node = document.querySelector(this.el);
    node.childNodes.forEach(child => {
      // 元素节点才处理
      child.nodeType === 1 && this.compileElement(child)
      // 遍历所有子节点
      if (child.childNodes.length > 0) {
        child.childNodes.forEach(child => {
          child.nodeType === 1 && this.compileElement(child)
        })
      }
    })
  }

  // 具体处理
  compileElement(node) {
    Array.from(node.attributes).forEach(attr => {
      const key = attr.value;
      if (attr.name === 'v-model') {
        // 初始赋值
        node.value = this.vm[key];
        // 当发现v-model后，实例化watcher，界面更新函数由这里传给watcher调用。在实例化中，将watcher添加到发布队列中
        new Watcher(this.vm, key, () => {
          node.value = this.vm[key];
        })
        // 界面变化时，自动修改数据
        node.addEventListener('input', e => {
          this.vm[key] = e.target.value
          console.log('you changed the property:' + key + ' to ' + e.target.value + ' and the data had refresh');
        })
      }
    })
  }
}

// 发布者，观察者的收集队列
class Dep {
  constructor() {
    this.subscribers = []
  }

  // 收集观察者
  depend() {
    if (Dep.target && !this.subscribers.includes(Dep.target)) {
      this.subscribers.push(Dep.target)
    }
  }

  // 数据变化时，通知观察者更新视图
  notify() {
    this.subscribers.forEach(watch => {
      watch.update()
    })
  }
}

Dep.target = null;

// 观察者（订阅者）
class Watcher {
  constructor(vm, key, cb) {
    this.vm = vm;
    this.key = key;
    this.cb = cb;

    Dep.target = this;
    // 实例化时，加入订阅队列,需要劫持的get函数那里depend到Dep
    this.vm[key];
    Dep.target = null;
  }

  // 调用回调函数，更新视图
  update() {
    this.cb(this.vm[this.key])
  }
}
