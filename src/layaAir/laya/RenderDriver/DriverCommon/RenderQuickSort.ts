import { FastSinglelist } from "../../utils/SingletonList";
import { IRenderElement3D } from "../DriverDesign/3DRenderPass/I3DRenderPass";

/**
 * 渲染节点快速排序
 */
export class RenderQuickSort {
    /**
     * @zh 小分区改用插入排序的元素数阈值。
     * @en Element-count threshold below which partitions fall back to insertion sort.
     */
    private static readonly INSERTION_SORT_THRESHOLD = 16;

    private elementArray: FastSinglelist<IRenderElement3D>;
    private isTransparent: boolean;

    /**
     * 快速排序
     * @param elements 
     * @param isTransparent 
     * @param left 
     * @param right 
     */
    sort(elements: FastSinglelist<IRenderElement3D>, isTransparent: boolean, left: number, right: number): void {
        this.elementArray = elements;
        this.isTransparent = isTransparent;
        this._quickSort(left, right);
    }

    /**
     * @internal
     * 3 路划分快速排序：中位数选取 pivot，等值元素一趟归入中段（渲染队列大量重复时退化
     * 为 O(n)），小分区改插入排序，且每轮只递归较小的一侧、较大的一侧就地迭代，使递归
     * 深度不超过 O(log n)。
     */
    private _quickSort(left: number, right: number): void {
        if (!(this.elementArray.length > 1))
            return;

        const elements: IRenderElement3D[] = this.elementArray.elements;
        while (left < right) {
            if (right - left + 1 <= RenderQuickSort.INSERTION_SORT_THRESHOLD) {
                this._insertionSort(elements, left, right);
                return;
            }

            const [lt, gt] = this._partitionRenderObject(elements, left, right);
            if (lt - left < right - gt) {
                if (left < lt - 1)
                    this._quickSort(left, lt - 1);
                left = gt + 1;
            } else {
                if (gt + 1 < right)
                    this._quickSort(gt + 1, right);
                right = lt - 1;
            }
        }
    }

    /**
     * @internal
     * 对小分区做插入排序。
     */
    private _insertionSort(elements: IRenderElement3D[], left: number, right: number): void {
        for (let i = left + 1; i <= right; i++) {
            const current = elements[i];
            let j = i - 1;
            while (j >= left && this._compare(elements[j], current) > 0) {
                elements[j + 1] = elements[j];
                j--;
            }
            elements[j + 1] = current;
        }
    }

    /**
     * @internal
     * 取首、中、尾三个元素的中位数作为 pivot，避免已排序输入退化。
     */
    private _medianOfThree(elements: IRenderElement3D[], left: number, right: number): IRenderElement3D {
        const mid = left + ((right - left) >> 1);
        const a = elements[left], b = elements[mid], c = elements[right];
        if (this._compare(a, b) < 0) {
            if (this._compare(b, c) < 0) return b;
            return this._compare(a, c) < 0 ? c : a;
        }
        if (this._compare(a, c) < 0) return a;
        return this._compare(b, c) < 0 ? c : b;
    }

    /**
     * @internal
     * 3 路划分：返回 `[lt, gt]`，`[left, lt)` 小于 pivot、`[lt, gt]` 等于 pivot、
     * `(gt, right]` 大于 pivot。
     */
    private _partitionRenderObject(elements: IRenderElement3D[], left: number, right: number): [number, number] {
        const pivot = this._medianOfThree(elements, left, right);
        let lt = left, i = left, gt = right;
        while (i <= gt) {
            const cmp = this._compare(elements[i], pivot);
            if (cmp < 0) {
                const temp = elements[lt];
                elements[lt] = elements[i];
                elements[i] = temp;
                lt++;
                i++;
            } else if (cmp > 0) {
                const temp = elements[i];
                elements[i] = elements[gt];
                elements[gt] = temp;
                gt--;
            } else i++;
        }
        return [lt, gt];
    }

    /**
     * @internal
     */
    private _compare(left: IRenderElement3D, right: IRenderElement3D): number {
        const renderQueue = left.materialRenderQueue - right.materialRenderQueue;
        if (renderQueue === 0) {
            const sort = this.isTransparent ? right.owner.distanceForSort - left.owner.distanceForSort : left.owner.distanceForSort - right.owner.distanceForSort;
            return sort + right.owner.sortingFudge - left.owner.sortingFudge;
        } else return renderQueue;
    }
}