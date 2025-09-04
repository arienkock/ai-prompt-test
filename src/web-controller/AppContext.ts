import { UserRepository } from "@/data-access/repositories/UserRepository";
import { AppContext, Context } from "@/domain/types/Context";
import { PrismaClient } from '@prisma/client';
import { CreateLogger } from "./services/LoggingService";


export const CreateAppContext: () => AppContext = () => {
    const prisma = new PrismaClient();
    const appCtx: AppContext = {
        logger: CreateLogger(),
        userRepository: new UserRepository(prisma),
        transactionally(cb) {
            prisma.$transaction(async (tx) => {
                cb({
                    userRepository: new UserRepository(tx as PrismaClient)
                })
            })
        },
        createRequestContext() {
            const context = new Context(appCtx)
            return context
        },
        async init() {
            
        },
        async shutdown() {
            
        },
    }
    return appCtx
}
