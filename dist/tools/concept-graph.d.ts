export declare function addConcept(id: string, name: string, topic?: string, description?: string): object;
export declare function addConceptDependency(prerequisiteId: string, dependentId: string, strength?: "required" | "recommended" | "helpful"): object;
export declare function getLearningPath(targetConceptId: string): object;
export declare function visualizeKnowledgeGraph(topic?: string): object;
export declare function findKnowledgeGaps(): object;
export declare function suggestNextConcept(): object;
export declare function getGraphStats(): object;
//# sourceMappingURL=concept-graph.d.ts.map