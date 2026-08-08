
export interface UserType {
    
    name: string;
    email: string;
    username: string;
    about: string | null;
    phone: string;
    role?: string;
    banned?: boolean;
    contributor: number;
    password?: string|undefined;
}

export interface UserTypeWithId  extends UserType {
    id:string
}
