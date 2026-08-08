import { Request, Response, NextFunction } from 'express';

 const authUserMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};




export default authUserMiddleware


