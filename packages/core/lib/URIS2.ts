/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

export interface URItoKind2<E, A> {}

export type URIS2 = keyof URItoKind2<unknown, unknown>;

export type Kind2<F extends URIS2, E, A> = URItoKind2<E, A>[F];
