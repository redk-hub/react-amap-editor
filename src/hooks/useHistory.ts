// src/hooks/useHistory.ts
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type {
  HistoryState,
  Id,
  Polygon,
  Behave,
  UndoOrRedoRes,
} from "../types";
import { useEventBus } from "@/utils/eventBus";

type Opts<T> = {
  update?: (features: T) => void;
  max?: number;
};

type StackItem = {
  annotation: string; // 绘制的一个描述
  feature: Polygon; // 所有修改未保存的要素信息
};

export default function useHistory<T = Polygon[]>(opt: Opts<T>) {
  const bus = useEventBus();

  const modifyIndex = useRef<number>(-1); // 记录当前所处的要素索引位置
  const modifies = useRef<string[]>([]); // 记录每一步修改的要素ID
  const undoNumber = useRef<number>(0); // 记录编辑后的撤销次数，每次编辑后重置undoNumber，确保重做的次数与编辑后撤销的次数相等
  const [actionNum, setActionNum] = useState<number>(0);
  const stacks = useRef<{
    [id: string]: {
      stackItems: StackItem[];
      index: number;
    };
  }>({});

  // Add effect to check for cached data on mount
  // useEffect(() => {
  //   try {
  //     const cachedData = localStorage.getItem("unsaved_history");
  //     if (cachedData) {
  //       const shouldRestore =
  //         window.confirm("发现未保存的编辑记录，是否恢复？");
  //       if (shouldRestore) {
  //         const {
  //           index,
  //           modifies: cachedModifies,
  //           stacks: cachedStacks,
  //         } = JSON.parse(cachedData);
  //         modifyIndex.current = index;
  //         modifies.current = cachedModifies;
  //         stacks.current = cachedStacks;
  //         setActionNum((num) => num + 1);
  //       } else {
  //         localStorage.removeItem("unsaved_history");
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Failed to restore cached history:", error);
  //   }
  // }, []);

  const disableUndo = useMemo(() => {
    if (modifyIndex.current < 0) {
      return true;
    }
    if (
      modifies.current[modifyIndex.current]
        .split("#")
        .every((id) => stacks.current[id]?.index == 0)
    ) {
      return true;
    }

    if (modifyIndex.current >= modifies.current.length) {
      return true;
    }

    return false;
  }, [actionNum]);

  const disableRedo = useMemo(() => {
    if (undoNumber.current === 0) {
      return true;
    }
    if (modifyIndex.current >= modifies.current.length - 1) {
      return true;
    }
    return false;
  }, [actionNum]);

  const save = () => {
    try {
      localStorage.setItem(
        "unsaved_history",
        JSON.stringify({
          index: modifyIndex.current,
          modifies: modifies.current,
          stacks: stacks.current,
        })
      );
    } catch {
      throw new Error("data cache is failed!");
    }
  };

  const pushHistory = useCallback((behave: Behave) => {
    const { annotation, features } = behave;
    const ids = Array.from(new Set(features.map((item) => item.id))).join("#");
    modifies.current.push(ids);

    features.forEach((feature) => {
      const tempList = modifies.current.filter(
        (item) => item == `temp_${feature.id}`
      );
      if (tempList.length) {
        // 如果之前有临时要素，则把临时要素的记录删掉
        modifies.current = modifies.current.filter(
          (item) => item != `temp_${feature.id}`
        );
        modifyIndex.current = modifyIndex.current - tempList.length;
        delete stacks.current[`temp_${feature.id}`];
      }
      if (!stacks.current[feature.id]) {
        addStackItem({
          feature: {
            ...feature,
            geometry: null,
          },
          annotation: "add base",
        });
      }
      const stackItem: StackItem = {
        annotation,
        feature: JSON.parse(JSON.stringify(feature)),
      };
      addStackItem(stackItem);
    });

    modifyIndex.current = modifies.current.length - 1;
    undoNumber.current = 0;
    save();
    setActionNum((num) => num + 1);
  }, []);

  const addStackItem = useCallback((item: StackItem) => {
    const id = item.feature.id;
    if (!stacks.current[id]) {
      stacks.current[id] = {
        stackItems: [],
        index: 0,
      };
    } else {
      stacks.current[id].stackItems = stacks.current[id].stackItems.slice(
        0,
        stacks.current[id].index + 1
      );
    }

    stacks.current[id].stackItems.push(item);
    stacks.current[id].index = stacks.current[id].stackItems.length - 1;
  }, []);

  const undo = () => {
    if (disableUndo) {
      return;
    }

    const resValues: UndoOrRedoRes[] = [];
    const ids = modifies.current[modifyIndex.current];
    ids.split("#").forEach((id) => {
      const resItem: UndoOrRedoRes = {
        oldValue: undefined,
        newValue: undefined,
      };
      const stack = stacks.current[id];

      if (!stack) {
        throw new Error("要素信息不完整");
      }

      const { stackItems, index } = stack;

      if (index <= 0 || index >= stackItems.length) {
        return;
      }

      if (!stackItems[index]?.feature?.geometry?.coordinates?.length) {
        resItem.oldValue = undefined;
      } else {
        resItem.oldValue = JSON.parse(
          JSON.stringify(stackItems[index].feature)
        );
      }
      // 前一个位置的要素
      const prev = index - 1;
      // 往上层传递深度拷贝后的值，不然会影响stacks里的值
      // this.options.wait(JSON.parse(JSON.stringify([stackItems[prev]])));

      if (!stackItems[prev]?.feature?.geometry?.coordinates?.length) {
        // 表示要删除这个要素
        resItem.newValue = undefined;
      } else {
        resItem.newValue = JSON.parse(JSON.stringify(stackItems[prev].feature));
      }

      resValues.push(resItem);

      stack.index = prev;
    });

    undoNumber.current++;
    modifyIndex.current = modifyIndex.current - 1;
    save();

    setActionNum((num) => num + 1);
    bus.emit("history:undo", resValues);
    return resValues;
  };

  const redo = () => {
    if (disableRedo) {
      return;
    }

    undoNumber.current--;

    const resValues: UndoOrRedoRes[] = [];
    const ids = modifies.current[modifyIndex.current + 1];
    ids.split("#").forEach((id) => {
      const resItem: UndoOrRedoRes = {
        oldValue: undefined,
        newValue: undefined,
      };
      const stack = stacks.current[id];

      if (!stack) {
        throw new Error("要素信息不完整");
      }

      const { stackItems, index } = stack;

      if (index >= stackItems.length - 1) {
        return;
      }
      if (!stackItems[index]?.feature?.geometry?.coordinates?.length) {
        // 表示当前要素是新增的
        resItem.oldValue = undefined;
      } else {
        resItem.oldValue = JSON.parse(
          JSON.stringify(stackItems[index].feature)
        );
      }
      // 后一个位置
      const next = index + 1;

      // this.options.wait(JSON.parse(JSON.stringify([stackItems[next]])));

      if (!stackItems[next]?.feature?.geometry?.coordinates?.length) {
        // 表示当前要素是新增的
        resItem.newValue = undefined;
      } else {
        resItem.newValue = JSON.parse(JSON.stringify(stackItems[next].feature));
      }

      resValues.push(resItem);

      stack.index = next;
    });

    modifyIndex.current = modifyIndex.current + 1;
    save();
    setActionNum((num) => num + 1);
    bus.emit("history:redo", resValues);
    return resValues;
  };

  const initial = (features: Polygon[], clear: boolean) => {
    if (clear) {
      modifyIndex.current = -1;
      modifies.current = [];
      undoNumber.current = 0;
      stacks.current = {};
    }
    features.forEach((feature) => {
      if (!stacks.current[feature.id]) {
        addStackItem({
          feature: JSON.parse(JSON.stringify(feature)),
          annotation: "add base",
        });
      }
    });
  };

  const getUnSavedFeatures = (): { operate: string; feature: Polygon }[] => {
    if (modifyIndex.current < 0) {
      return [];
    }
    let unSaved: { operate: string; feature: Polygon }[] = [];
    let operate: string = "update";
    modifies.current.slice(0, modifyIndex.current + 1).forEach((ids, index) => {
      ids.split("#").forEach((id) => {
        const stack = stacks.current[id];

        if (!stack) {
          throw new Error("要素信息不完整");
        }

        const { stackItems, index: stackIndex } = stack;
        if (stackIndex <= 0) {
          return;
        }
        // 如果基类有经纬度，当前没有经纬度，表示删除
        // 如果基类没有经纬度，当前有经纬度，表示新增
        // 如果基类和当前都有经纬度，表示修改
        if (
          !stackItems[0]?.feature?.geometry?.coordinates?.length &&
          stackItems[stackIndex]?.feature?.geometry?.coordinates?.length
        ) {
          operate = "add";
        } else if (
          stackItems[0]?.feature?.geometry?.coordinates?.length &&
          stackItems[stackIndex]?.feature?.geometry?.coordinates?.length
        ) {
          operate = "update";
        } else if (
          stackItems[0]?.feature?.geometry?.coordinates?.length &&
          !stackItems[stackIndex]?.feature?.geometry?.coordinates?.length
        ) {
          operate = "delete";
        }

        unSaved.push({ operate, feature: stackItems[stackIndex].feature });
      });
    });

    return unSaved;
  };

  const clearHistory = () => {
    localStorage.removeItem("unsaved_history");
    modifyIndex.current = -1;
    modifies.current = [];
    undoNumber.current = 0;
    stacks.current = {};
  };

  return {
    initial,
    pushHistory,
    undo,
    redo,
    getUnSavedFeatures,
    clearHistory,
    disableUndo,
    disableRedo,
  };
}
