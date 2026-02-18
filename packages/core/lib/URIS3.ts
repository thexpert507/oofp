/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

export interface URItoKind3<_R, _E, _A> {}

export type URIS3 = keyof URItoKind3<unknown, unknown, unknown>;

export type Kind3<F extends URIS3, R, E, A> = URItoKind3<R, E, A>[F];
