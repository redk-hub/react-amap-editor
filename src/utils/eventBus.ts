import React from "react";
import { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import mitt from "mitt";
import type { Emitter } from "mitt";

// 定义支持的事件类型
type EventType = "history:undo" | "history:redo";
type Events = {
  [K in EventType]: void;
};

// 限定支持的事件名称
const allowedEvents: EventType[] = ["history:undo", "history:redo"];

// 定义 EventBus 接口
interface EventBus {
  emit: (type: EventType, e: any) => void;
  on: (type: EventType, handler: (e: any) => void) => void;
  off: (type: EventType, handler: (e: any) => void) => void;
}

/**
 * 自定义 EventBus，包装 mitt
 */
function createRestrictedEventBus(): EventBus {
  const emitter: Emitter<Events> = mitt<Events>();

  return {
    emit(type: EventType, e?: any) {
      if (!allowedEvents.includes(type)) {
        throw new Error(`Unsupported event: ${type}`);
      }
      emitter.emit(type, e);
    },

    on(type: EventType, handler: (e: any) => void) {
      if (!allowedEvents.includes(type)) {
        throw new Error(`Unsupported event: ${type}`);
      }
      emitter.on(type, handler);
    },

    off(type: EventType, handler: (e: any) => void) {
      if (!allowedEvents.includes(type)) {
        throw new Error(`Unsupported event: ${type}`);
      }
      emitter.off(type, handler);
    },
  };
}

// 创建 React Context
const EventBusContext = createContext<EventBus | null>(null);

export const EventBusProvider = ({ children }: PropsWithChildren) => {
  const bus = useMemo(() => createRestrictedEventBus(), []);
  return React.createElement(
    EventBusContext.Provider,
    { value: bus },
    children
  );
};

export const useEventBus = (): EventBus => {
  const bus = useContext(EventBusContext);
  if (!bus) throw new Error("useEventBus must be used within EventBusProvider");
  return bus;
};
