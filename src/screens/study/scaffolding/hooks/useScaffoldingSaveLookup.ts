import { useMemo } from "react";
import type { KeywordInstance } from "../logic/scaffoldingLogic";

export function useScaffoldingSaveLookup(keywordInstances: KeywordInstance[]) {
  return useMemo(() => {
    const blankIdByInstance = new Map<number, number>();
    const keywordInstanceById = new Map<number, KeywordInstance>();

    keywordInstances.forEach((instance) => {
      blankIdByInstance.set(instance.instanceId, instance.blankId);
      keywordInstanceById.set(instance.instanceId, instance);
    });

    return {
      blankIdByInstance,
      keywordInstanceById,
    };
  }, [keywordInstances]);
}
