import { RuleCollection } from './rule';

export interface Grammar {
    axiom: string;
    rules: RuleCollection;
}
