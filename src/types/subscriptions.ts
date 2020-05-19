/** The scope of the data in a subscription */
export enum MercurySubscriptionScope {
	/** Anonymous (eventName only): Receives this event across all organizations and locations */
	AnonymousGlobal = 'anonymousGlobal',
	/** Anonymous (eventName only): Receives this event across an entire organization including all locations in the organization. */
	AnonymousOrganization = 'anonymousOrganization',
	/** Anonymous (eventName only): Receives this event across all organizations and locations */
	AnonymousLocation = 'anonymousLocation',
	/** Anonymous (eventName only): Receives this event for a user */
	AnonymousUser = 'anonymousUser',
	/** Receives this event across all organizations and locations */
	Global = 'global',
	/** Receives this event across an entire organization including all locations in the organization. */
	Organization = 'organization',
	/** Receives this event across all organizations and locations */
	Location = 'location',
	/** Receives this event for a user */
	User = 'user'
}
