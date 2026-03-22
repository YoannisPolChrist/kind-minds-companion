import { ExerciseBlock } from '../../types';
import { ExerciseBlockType } from '../../components/therapist/blocks/exerciseRegistry';

function uid(): string {
    return Math.random().toString(36).substring(2, 9);
}

export function createDefaultBlock(type: ExerciseBlockType): ExerciseBlock {
    const block: Partial<ExerciseBlock> = { id: uid(), type, content: '' };

    if (type === 'timer' || type === 'breathing') {
        block.duration = 120;
    }

    if (type === 'choice' || type === 'checklist' || type === 'spider_chart' || type === 'bar_chart' || type === 'pie_chart' || type === 'line_chart') {
        block.options = ['', ''];
    }

    if (type === 'scale') {
        block.minLabel = 'Gar nicht';
        block.maxLabel = 'Sehr stark';
    }

    return block as ExerciseBlock;
}

export function duplicateBlock(block: ExerciseBlock): ExerciseBlock {
    return { ...block, id: uid() };
}

export function moveBlock(blocks: ExerciseBlock[], id: string, direction: 'up' | 'down'): ExerciseBlock[] {
    const index = blocks.findIndex((entry) => entry.id === id);
    if (index === -1) return blocks;
    if (direction === 'up' && index === 0) return blocks;
    if (direction === 'down' && index === blocks.length - 1) return blocks;

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    const nextBlocks = [...blocks];
    [nextBlocks[index], nextBlocks[nextIndex]] = [nextBlocks[nextIndex], nextBlocks[index]];
    return nextBlocks;
}

export function normalizeBuilderPayload(blocks: ExerciseBlock[]): ExerciseBlock[] {
    return blocks.map((block) => Object.fromEntries(
        Object.entries(block).filter(([, value]) => value !== undefined && value !== null)
    ) as ExerciseBlock);
}

export function hasUnsavedChanges(
    initialState: { title?: string; coverImage?: string; themeColor?: string; blocks?: ExerciseBlock[] },
    currentState: { title: string; coverImage?: string; themeColor?: string; blocks: ExerciseBlock[] }
): boolean {
    const normalizedInitial = JSON.stringify({
        title: initialState.title || '',
        coverImage: initialState.coverImage || '',
        themeColor: initialState.themeColor || '',
        blocks: normalizeBuilderPayload(initialState.blocks || []),
    });

    const normalizedCurrent = JSON.stringify({
        title: currentState.title || '',
        coverImage: currentState.coverImage || '',
        themeColor: currentState.themeColor || '',
        blocks: normalizeBuilderPayload(currentState.blocks),
    });

    return normalizedInitial !== normalizedCurrent;
}
