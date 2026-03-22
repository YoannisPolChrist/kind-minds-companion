export interface TemplateRecord {
    id?: string;
    title: string;
    blocks: any[];
    archived?: boolean;
    themeColor?: string;
    therapistId?: string;
    coverImage?: string;
    [key: string]: any;
}

export interface TemplateEditorInput {
    title: string;
    blocks: any[];
    coverImage?: string;
    themeColor?: string;
}
