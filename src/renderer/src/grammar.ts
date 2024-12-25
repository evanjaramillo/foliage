import { RuleCollection } from './rule';

export type Axiom = string;

export interface Grammar {
    axiom: Axiom;
    rules: RuleCollection;
}

export const defaultGrammars: Grammar[] = [
    {
        axiom: 'X',
        rules: [
            {
                input: 'F',
                output: 'FX[FX[+XF]]',
                probability: 0,
            },
            {
                input: 'X',
                output: 'F[+XZ++X-F[+ZX]][-X++F-X]',
                probability: 0,
            },
            {
                input: 'Z',
                output: '[+F-X-F][++ZX]',
                probability: 0,
            },
        ],
    },
];
