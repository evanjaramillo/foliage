export interface PseudoRandomGenerator<T, V extends number> {
    hash(input: T): V;
    next(): V;
    nextInt(min: number, max: number): V;
    nextFloat(min: number, max: number): V;
}

export class PseudoRandom implements PseudoRandomGenerator<string, number> {
    private state: number;

    constructor(seed: string = 'default') {
        this.state = this.hash(seed);
    }

    public hash(input: string): number {
        let hash = 5381;
        let i = input.length;

        while (i) {
            hash = (hash * 33) ^ input.charCodeAt(--i);
        }

        return hash >>> 0;
    }

    public next(): number {
        this.state ^= this.state << 21;
        this.state ^= this.state >>> 3;
        this.state ^= this.state << 4;
        return (this.state >>> 0) / 0xffffffff; // Normalize to [0, 1)
    }

    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
    }

    public nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
    }
}
