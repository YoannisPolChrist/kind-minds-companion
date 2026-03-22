import React from 'react';
import { CinematicBreathingBlock } from '../CinematicBreathingBlock';
import { ExerciseBlock } from '../../../types';

interface ExerciseBreathingBlockProps {
    block: ExerciseBlock;
}

export default function ExerciseBreathingBlock({ block }: ExerciseBreathingBlockProps) {
    return <CinematicBreathingBlock block={block} />;
}
