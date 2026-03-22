import React from 'react';
import { SharedValue } from 'react-native-reanimated';
import { CinematicInfoBlock } from '../CinematicInfoBlock';
import { ExerciseBlock } from '../../../types';

interface ExerciseCinematicInfoBlockProps {
    block: ExerciseBlock;
    scrollY: SharedValue<number>;
    index: number;
}

export default function ExerciseCinematicInfoBlock({
    block,
    scrollY,
    index,
}: ExerciseCinematicInfoBlockProps) {
    return <CinematicInfoBlock block={block} scrollY={scrollY} index={index} />;
}
