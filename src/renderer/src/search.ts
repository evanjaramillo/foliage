export type SearchComparatorResult = -1 | 0 | 1;
export type KeyedElement<T, K extends keyof T> = [K, T[K]];

export interface SearchComparator<T> {
    (a: T, b: T): SearchComparatorResult;
}

export function defaultComparator<T>(a: T, b: T): SearchComparatorResult {
    return a < b ? -1 : a > b ? 1 : 0;
}

export function binarySearch<T>(
    array: T[],
    element: T,
    comparator: SearchComparator<T> = defaultComparator,
): number {
    let m = 0;
    let n = array.length - 1;

    while (m <= n) {
        const k = (n + m) >> 1;
        const cmp = comparator(element, array[k]);
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }

    return binarySearchResult(m);
}

export function keyedBinarySearch<T, K extends keyof T>(
    array: T[],
    element: KeyedElement<T, K>,
    comparator: SearchComparator<T[K]> = defaultComparator,
): number {
    let m = 0;
    let n = array.length - 1;
    const [key, target] = element;
    while (m <= n) {
        const k = (n + m) >> 1;
        const cmp = comparator(target, array[k][key]);
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }

    return binarySearchResult(m);
}

export function insert<T>(
    element: T,
    array: T[],
    comparator: SearchComparator<T> = defaultComparator<T>,
): void {
    let index = binarySearch(array, element, comparator);
    if (index < 0) {
        index = binarySearchResult(index);
    }
    array.splice(index, 0, element);
}

export function insertUnique<T>(
    element: T,
    array: T[],
    comparator: SearchComparator<T> = defaultComparator<T>,
): boolean {
    const index = binarySearch(array, element, comparator);

    if (index < 0) {
        const insertLocation = binarySearchResult(index);
        array.splice(insertLocation, 0, element);
        return true;
    }
    return false; // nothing to add.
}

export function findAll<T>(element: T, array: T[], comparator: SearchComparator<T>): T[] {
    const index = binarySearch(array, element, comparator);

    if (index < 0) {
        return []; // no matches were found.
    }

    const results: T[] = [];

    let left = index;
    let right = index;

    while (left >= 0 && comparator(array[left], element) === 0) {
        results.unshift(array[left]);
        left--;
    }

    while (right < array.length && comparator(array[right], element) === 0) {
        results.push(array[right]);
        right++;
    }

    return results;
}

export function keyedFindAll<T, K extends keyof T>(
    element: KeyedElement<T, K>,
    array: T[],
    comparator: SearchComparator<T[K]> = defaultComparator,
): T[] {
    const index = keyedBinarySearch(array, element, comparator);
    if (index < 0) {
        return []; // no matches were found.
    }

    const results: T[] = [];

    let left = index;
    let right = index;
    const [key, value] = element;
    while (left >= 0 && comparator(array[left][key], value) === 0) {
        results.unshift(array[left]);
        left--;
    }

    while (right < array.length && comparator(array[right][key], value) === 0) {
        results.push(array[right]);
        right++;
    }
    return results;
}

export function binarySearchResult(result: number): number {
    return -result - 1;
}
