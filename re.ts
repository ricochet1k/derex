import { Set, Record, List } from 'immutable';

export interface TypedBody<S extends string, B> {
	type: S;
	body: B;
}

export interface TypedRecord<S extends string, B>
	extends Record<TypedBody<S, B>>,
		Readonly<TypedBody<S, B>> {}

function factory<R extends TypedRecord<string, any>>(type: R['type']) {
	const inner = Record({ type, body: undefined });
	return (body: R['body']) => inner({ body }) as R;
}

export type Re = Chars | Empty | Concat | Kleene | Or | And | Not;

export type Class = Set<number>;

export interface Chars extends TypedRecord<'Chars', Class> {}
const Chars = factory<Chars>('Chars');

export function chars(allowedChars: string) {
	return Chars(
		Set().withMutations(set => {
			for (let i = 0; i < allowedChars.length; i++) {
				set.add(allowedChars.charCodeAt(i));
			}
		})
	);
}

export const NONE = Chars(Set());

export interface Empty extends Record<{ type: 'Empty' }>, Readonly<{ type: 'Empty' }> {}
export const EMPTY: Empty = Record({ type: 'Empty' as 'Empty' })();

export type ConcatItem = Chars | Kleene | Or | And | Not;
export interface Concat extends TypedRecord<'Concat', List<ConcatItem>> {}
const Concat = factory<Concat>('Concat');

export function concat(...regexps: Re[]) {
	let newList = List<ConcatItem>();

	for (let re of regexps) {
		switch (re.type) {
			case 'Empty': {
				break;
			}
			case 'Concat': {
				newList = newList.concat(re.body);
				break;
			}
			default: {
				if (re.equals(NONE)) {
					return NONE;
				}
				newList = newList.push(re);
				break;
			}
		}
	}

	if (newList.size === 0) {
		return EMPTY;
	}

	if (newList.size === 1) {
		return newList.first()!;
	}

	return Concat(newList);
}

export type KleeneBody = Chars | Concat | Or | And | Not;
export interface Kleene extends TypedRecord<'Kleene', KleeneBody> {}
const Kleene = factory<Kleene>('Kleene');

export function kleene(body: Re) {
	if (body.type === 'Empty' || body.type === 'Kleene') return body;
	if (body.equals(NONE)) return EMPTY;
	return Kleene(body);
}

export type OrItem = Chars | Empty | Concat | Kleene | And | Not;
export interface Or extends TypedRecord<'Or', Set<OrItem>> {}
const Or = factory<Or>('Or');

export function or(...regexps: Re[]) {
	let newSet = Set<OrItem>();
	let chars = Set<number>();

	for (let re of regexps) {
		switch (re.type) {
			case 'Chars': {
				chars = chars.union(re.body);
				break;
			}
			case 'Or': {
				newSet = newSet.union(re.body);
				break;
			}
			default: {
				if (re.equals(NOT_NONE)) {
					return NOT_NONE;
				}
				newSet = newSet.add(re);
				break;
			}
		}
	}

	if (!chars.isEmpty()) {
		newSet = newSet.add(Chars(chars));
	}

	if (newSet.size === 0) {
		return NONE;
	}

	if (newSet.size === 1) {
		return newSet.first()!;
	}

	return Or(newSet);
}

export type AndItem = Chars | Empty | Concat | Kleene | Or | Not;
export interface And extends TypedRecord<'And', Set<AndItem>> {}
const And = factory<And>('And');

export function and(...regexps: Re[]) {
	let newSet = Set<AndItem>();
	let chars: Set<number> | undefined;

	for (let re of regexps) {
		switch (re.type) {
			case 'Chars': {
				chars = chars === undefined ? re.body : chars.intersect(re.body);
				if (chars.isEmpty()) {
					return NONE;
				}
				break;
			}
			case 'And': {
				newSet = newSet.union(re.body);
				break;
			}
			default: {
				if (!re.equals(NOT_NONE)) {
					newSet = newSet.add(re);
				}
				break;
			}
		}
	}

	if (chars !== undefined) {
		newSet = newSet.add(Chars(chars));
	}

	if (newSet.size === 0) {
		return NOT_NONE;
	}

	if (newSet.size === 1) {
		return newSet.first()!;
	}

	return And(newSet);
}

export type NotBody = Chars | Empty | Concat | Kleene | Or | And;
export interface Not extends TypedRecord<'Not', NotBody> {}
const Not = factory<Not>('Not');

export function not(body: Re) {
	if (body.type === 'Not') return body.body;
	return Not(body);
}

export const NOT_NONE = Not(NONE);
