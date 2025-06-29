/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

#ifdef USE_TI_UISTACKVIEW

#import "TiUIView.h"

@interface TiUIStackView : TiUIView

@property (nonatomic, strong) UIStackView *stackView;

/**
 * Adds a view to the end of the arrangedSubviews array.
 */
- (void)addArrangedSubview:(TiViewProxy *)viewProxy;

/**
 * Removes the provided view from the stack's array of arranged subviews.
 */
- (void)removeArrangedSubview:(TiViewProxy *)viewProxy;

/**
 * Inserts the provided view into the arrangedSubviews array at the specified index.
 */
- (void)insertArrangedSubview:(NSDictionary *)params;

/**
 * Applies custom spacing after the specified view.
 */
- (void)setCustomSpacing:(NSArray *)args;

@end

#endif