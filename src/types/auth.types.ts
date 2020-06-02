/** Authenticate with Mercury as a User */
export interface IMercuryAuthUser {
	/** The user's JWT token */
	token: string
}
/** Authenticate with Mercury as a Skill */
export interface IMercuryAuthSkill {
	/** Your skill's ID */
	id: string

	/** Your skill's API key */
	apiKey: string
}

/** Authenticate with Mercury as a user */
export interface IMercuryAuthUsernamePassword {
	/** Your skill's ID */
	username: string

	/** Your skill's API key */
	password: string
}

export interface IAuthStatus {
	isAuthenticated: boolean
}

export type MercuryAuth =
	| IMercuryAuthUser
	| IMercuryAuthSkill
	| IMercuryAuthUsernamePassword

export enum MercuryRole {
	User = 'user',
	Skill = 'skill',
	Anonymous = 'anonymous'
}
