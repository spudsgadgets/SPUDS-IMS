const names = ['vendor','po','inventory','sales','customer']
const Store = {
  data: {},
  schema: {},
  init() {
    names.forEach(n => {
      try {
        const s = localStorage.getItem('schema_'+n)
        const d = localStorage.getItem('data_'+n)
        this.schema[n] = s ? JSON.parse(s) : []
        this.data[n] = d ? JSON.parse(d) : []
      } catch {
        this.schema[n] = []
        this.data[n] = []
      }
    })
  },
  getSchema(n) { return this.schema[n] || [] },
  setSchema(n, s) {
    this.schema[n] = s || []
    try { localStorage.setItem('schema_'+n, JSON.stringify(this.schema[n])) } catch {}
  },
  getData(n) { return this.data[n] || [] },
  setData(n, arr) {
    this.data[n] = arr || []
    try { localStorage.setItem('data_'+n, JSON.stringify(this.data[n])) } catch {}
  },
  addRow(n, obj) {
    const arr = this.getData(n).slice()
    arr.push(obj)
    this.setData(n, arr)
  }
}
export default Store
