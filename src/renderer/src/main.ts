import { FoliageRenderer } from './renderer';
import { defaultGrammars } from './grammar';

function init(): void {
    window.addEventListener('DOMContentLoaded', () => {
        new FoliageRenderer(defaultGrammars[0], 4);
    });
}

init();
