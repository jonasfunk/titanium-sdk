/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
#ifdef USE_TI_UISCROLLVIEW

#import <TitaniumKit/TiViewProxy.h>

@interface TiUIScrollViewProxy : TiViewProxy <UIScrollViewDelegate> {
  TiPoint *contentOffset;
}
- (void)setContentOffset:(id)value withObject:(id)animated;
- (void)layoutChildrenAfterContentSize:(BOOL)optimize;
- (void)setContentInsets:(id)value withObject:(id)animated;
- (void)setZoomScale:(id)value withObject:(id)animated;

- (id)contentInsets;

@end

#endif
