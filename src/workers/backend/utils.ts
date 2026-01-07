export class FirstInLastOutArray<T> {
    private data: Array<T>;
    private ptr: number = -1;
    public length: number;
    constructor (len: number) {
        this.data = new Array(len)
        this.length = len
    }
    push (elem: T) {
        this.data[++this.ptr % this.length] = elem;
    }
    /** Warning: Do not modify returned array! I will not copy for sake of speed */
    getArray () {
        return this.data
    }
    fill (t: T) {
        this.data.fill(t)
    }
}