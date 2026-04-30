import type { PuzzleTypeModule } from './shared/types/puzzle-type';
import { nonogramModule } from './nonogram';

/** All registered puzzle type modules. */
export const puzzleModules: PuzzleTypeModule[] = [nonogramModule];
