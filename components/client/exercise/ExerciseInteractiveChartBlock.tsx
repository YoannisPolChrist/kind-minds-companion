import React from 'react';
import InteractiveChart from '../../charts/InteractiveChart';
import { ExerciseBlock } from '../../../types';

interface ExerciseInteractiveChartBlockProps {
    block: ExerciseBlock;
    value: string;
    onChange: (value: string) => void;
}

export default function ExerciseInteractiveChartBlock({
    block,
    value,
    onChange,
}: ExerciseInteractiveChartBlockProps) {
    return <InteractiveChart block={block} value={value} onChange={onChange} />;
}
