export type ResourceType = 'document' | 'pdf' | 'file' | 'image' | 'video' | 'link';

export type ResourceFilter = 'all' | 'documents' | 'media' | 'links';

export interface ResourceRecord {
    id: string;
    title: string;
    description?: string;
    type: ResourceType;
    url: string;
    storagePath?: string | null;
    originalName?: string | null;
    tags?: string[];
    isPinned?: boolean;
    createdAt?: any;
    [key: string]: any;
}

export interface CreateLinkResourceInput {
    title: string;
    description: string;
    linkUrl: string;
    tagsInput: string;
}

export interface CreateFileResourceInput {
    title: string;
    description: string;
    tagsInput: string;
}
