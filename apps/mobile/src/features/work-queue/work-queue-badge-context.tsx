import { createContext, useContext, useState, type ReactNode } from 'react';

type WorkQueueBadgeContextValue = {
  overdue: number;
  setOverdue: (n: number) => void;
};

const WorkQueueBadgeContext = createContext<WorkQueueBadgeContextValue>({
  overdue: 0,
  setOverdue: () => {},
});

export function WorkQueueBadgeProvider({ children }: { children: ReactNode }) {
  const [overdue, setOverdue] = useState(0);
  return (
    <WorkQueueBadgeContext.Provider value={{ overdue, setOverdue }}>
      {children}
    </WorkQueueBadgeContext.Provider>
  );
}

export function useWorkQueueBadge(): WorkQueueBadgeContextValue {
  return useContext(WorkQueueBadgeContext);
}
