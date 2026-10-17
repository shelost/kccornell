export type AccentColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple';

export const site = {
	name: 'KCC',
	fullName: 'Korean Church at Cornell',
	korean: '코넬 한인 교회',
	tagline: 'A home away from home.',
	description:
		'A community of students and families at Cornell University gathering to worship, grow, and share life together — in Korean and English.',
	email: 'hello@kccornell.org',
	instagram: 'kccornell',
	address: 'Anabel Taylor Hall, Cornell University, Ithaca, NY'
};

export const navLinks = [
	{ href: '/', label: 'Home' },
	{ href: '/about', label: 'About' },
	{ href: '/events', label: 'Events' },
	{ href: '/play', label: 'Play' },
	{ href: '/contact', label: 'Contact' }
];

export interface Service {
	title: string;
	day: string;
	time: string;
	location: string;
	color: AccentColor;
	note: string;
}

export const services: Service[] = [
	{
		title: 'Sunday Worship',
		day: 'Sundays',
		time: '1:30 PM',
		location: 'Anabel Taylor Hall',
		color: 'purple',
		note: 'Bilingual worship with lunch together afterwards.'
	},
	{
		title: 'Friday Fellowship',
		day: 'Fridays',
		time: '7:00 PM',
		location: 'Anabel Taylor Hall',
		color: 'red',
		note: 'College night — praise, small groups, and late-night food.'
	},
	{
		title: 'Bible Study',
		day: 'Wednesdays',
		time: '8:00 PM',
		location: 'On campus & Zoom',
		color: 'blue',
		note: 'Midweek small-group study through one book at a time.'
	}
];

export interface Value {
	title: string;
	korean: string;
	body: string;
	color: AccentColor;
	shape: 'triangle' | 'diamond' | 'circle' | 'square';
}

export const values: Value[] = [
	{
		title: 'Worship',
		korean: '예배',
		body: 'We gather every week to worship God wholeheartedly, in two languages and one spirit.',
		color: 'red',
		shape: 'triangle'
	},
	{
		title: 'Word',
		korean: '말씀',
		body: 'Scripture shapes everything we do — we read it, study it, and live it out together.',
		color: 'blue',
		shape: 'diamond'
	},
	{
		title: 'Community',
		korean: '공동체',
		body: 'Shared meals, small groups, and open doors. Nobody does college — or life — alone here.',
		color: 'yellow',
		shape: 'circle'
	},
	{
		title: 'Service',
		korean: '섬김',
		body: 'We serve one another, the campus, and Ithaca with open hands and humble hearts.',
		color: 'green',
		shape: 'square'
	}
];

export interface EventItem {
	title: string;
	date: string;
	time: string;
	location: string;
	tag: string;
	color: AccentColor;
	description: string;
}

export const events: EventItem[] = [
	{
		title: 'Welcome Night',
		date: 'Fri, Sep 11',
		time: '7:00 PM',
		location: 'Anabel Taylor Hall',
		tag: 'Fellowship',
		color: 'red',
		description:
			'Kick off the semester with dinner, games, and new friends. First-years and newcomers especially welcome.'
	},
	{
		title: 'Fall Retreat',
		date: 'Oct 2 – 4',
		time: 'All weekend',
		location: 'Lakeside Retreat Center',
		tag: 'Retreat',
		color: 'purple',
		description:
			'A weekend away from campus to rest, worship, and reset — with bonfires, workshops, and way too much food.'
	},
	{
		title: 'Ithaca Serve Day',
		date: 'Sat, Nov 7',
		time: '9:00 AM',
		location: 'Downtown Ithaca',
		tag: 'Service',
		color: 'green',
		description:
			'Join us as we volunteer around Ithaca — food pantry, park cleanup, and neighborhood projects.'
	},
	{
		title: 'Thanksgiving Potluck',
		date: 'Sun, Nov 22',
		time: '5:00 PM',
		location: 'Anabel Taylor Hall',
		tag: 'Fellowship',
		color: 'yellow',
		description:
			'Our biggest meal of the year. Bring a dish (or just yourself) and celebrate the semester together.'
	},
	{
		title: 'Christmas Worship Night',
		date: 'Sun, Dec 13',
		time: '7:00 PM',
		location: 'Sage Chapel',
		tag: 'Worship',
		color: 'blue',
		description:
			'Carols, candlelight, and a message of hope to close out the year before winter break.'
	}
];

export interface Ministry {
	title: string;
	body: string;
	color: AccentColor;
}

export const ministries: Ministry[] = [
	{
		title: 'College Ministry',
		body: 'Undergrads and grad students walking through campus life together with weekly small groups.',
		color: 'red'
	},
	{
		title: 'Praise Team',
		body: 'Musicians and vocalists leading worship every Sunday and Friday night.',
		color: 'blue'
	},
	{
		title: 'Hospitality',
		body: 'The team behind every shared meal, welcome table, and airport pickup.',
		color: 'yellow'
	},
	{
		title: 'Outreach',
		body: 'Serving Ithaca locally and supporting missions around the world.',
		color: 'green'
	}
];
