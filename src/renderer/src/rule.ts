import { keyedFindAll } from './search';

export interface Rule {
    input: string;
    output: string;
    probability: number;
}

export type RuleCollection = [Rule, ...Rule[]];

export function selectRule(rules: Rule[]): Rule {
    const totalProbability = rules.reduce(
        (sum, item) => sum + item.probability,
        0,
    );

    if (totalProbability > 0) {
        const rand = Math.random() * totalProbability;
        let cumulativeProbability = 0;
        for (const rule of rules) {
            cumulativeProbability += rule.probability;
            if (rand < cumulativeProbability) {
                return rule;
            }
        }
    }

    return rules[0];
}

export function applyRules(input: string, rules: RuleCollection): string {
    let output = '';

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const matchingRules = keyedFindAll(['input', char], rules);
        if (matchingRules.length <= 0) {
            output += char;
            continue;
        }

        const rule = selectRule(matchingRules);
        output += rule.output;
    }

    return output;
}
