/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

#ifdef USE_TI_UISTACKVIEW

#import "TiViewProxy.h"

@interface TiUIStackViewProxy : TiViewProxy

/**
 * Adds a view to the end of the arrangedSubviews array.
 * @param args The view to add to the array of views arranged by the stack view.
 */
- (void)addArrangedSubview:(id)args;

/**
 * Removes the provided view from the stack's array of arranged subviews.
 * @param args The view to remove from the array of views arranged by the stack view.
 */
- (void)removeArrangedSubview:(id)args;

/**
 * Inserts the provided view into the arrangedSubviews array at the specified index.
 * @param args Array containing the view and index.
 */
- (void)insertArrangedSubview:(id)args;

/**
 * Applies custom spacing after the specified view.
 * @param args Array containing the spacing value and the view after which to apply it.
 */
- (void)setCustomSpacing:(id)args;

@end

#endif