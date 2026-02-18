/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

export interface URItoKind<A> {
  Array: Array<A>;
  Promise: Promise<A>;
}

export type URIS = keyof URItoKind<unknown>;

export type Kind<F extends URIS, A> = URItoKind<A>[F];
