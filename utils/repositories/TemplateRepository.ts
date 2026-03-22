import {
    collection, query, where, getDocs, updateDoc, doc, limit, setDoc, getDoc, addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../errors';

export interface ExerciseTemplate {
    id?: string;
    title: string;
    blocks: any[];
    archived?: boolean;
    themeColor?: string;
    [key: string]: any;
}

export class TemplateRepository {
    /** Single template by ID */
    static async findById(id: string): Promise<ExerciseTemplate | null> {
        try {
            const snapshot = await getDoc(doc(db, 'exercise_templates', id));
            if (!snapshot.exists()) return null;
            return { id: snapshot.id, ...snapshot.data() } as ExerciseTemplate;
        } catch (error) {
            logger.error(`Failed to fetch template ${id}`, error);
            throw error;
        }
    }

    /** Fetch all active (unarchived) templates */
    static async findActiveTemplates(limitCount: number = 50, therapistId?: string): Promise<ExerciseTemplate[]> {
        try {
            let q;
            if (therapistId) {
                q = query(collection(db, "exercise_templates"), where('therapistId', '==', therapistId), limit(limitCount));
            } else {
                q = query(collection(db, "exercise_templates"), limit(limitCount));
            }
            const querySnapshot = await getDocs(q);

            const templateData: ExerciseTemplate[] = [];
            querySnapshot.forEach((doc) => {
                templateData.push({ id: doc.id, ...doc.data() } as ExerciseTemplate);
            });

            return templateData.filter(t => !t.archived);
        } catch (error) {
            logger.error('Failed to fetch active templates', error, { collection: 'exercise_templates', limitCount });
            throw error; // Let UI handle toast
        }
    }

    /** Archive a template */
    static async archiveTemplate(id: string): Promise<void> {
        try {
            await updateDoc(doc(db, "exercise_templates", id), { archived: true });
        } catch (error) {
            logger.error(`Failed to archive template ${id}`, error);
            throw error;
        }
    }

    /** Change the theme color of a template */
    static async updateThemeColor(id: string, color: string): Promise<void> {
        try {
            await updateDoc(doc(db, "exercise_templates", id), { themeColor: color });
        } catch (error) {
            logger.error(`Failed to update theme color for template ${id}`, error);
            throw error;
        }
    }

    static async createTemplate(template: ExerciseTemplate): Promise<string> {
        try {
            const newRef = doc(collection(db, 'exercise_templates'));
            await setDoc(newRef, template);
            return newRef.id;
        } catch (error) {
            logger.error('Failed to create template', error);
            throw error;
        }
    }

    static async updateTemplate(id: string, template: Partial<ExerciseTemplate>): Promise<void> {
        try {
            await updateDoc(doc(db, 'exercise_templates', id), template);
        } catch (error) {
            logger.error(`Failed to update template ${id}`, error);
            throw error;
        }
    }

    /** Assign a template to a client (creates a new exercise) */
    static async assignToClient(template: ExerciseTemplate, clientId: string): Promise<void> {
        try {
            const newExerciseRef = doc(collection(db, "exercises"));
            await setDoc(newExerciseRef, {
                title: template.title,
                blocks: template.blocks || [],
                clientId: clientId,
                status: 'assigned',
                completed: false,
                assignedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            logger.info('Template assigned to client', { templateId: template.id, clientId });
        } catch (error) {
            logger.error('Failed to assign template to client', error, { templateId: template.id, clientId });
            throw error;
        }
    }
}
