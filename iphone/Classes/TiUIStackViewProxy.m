/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

#ifdef USE_TI_UISTACKVIEW

#import "TiUIStackViewProxy.h"
#import "TiUIStackView.h"
#import "TiUtils.h"

@implementation TiUIStackViewProxy

- (NSString *)apiName
{
  return @"Ti.UI.StackView";
}

- (void)_initWithProperties:(NSDictionary *)properties
{
  [self initializeProperty:@"axis" defaultValue:@"vertical"];
  [self initializeProperty:@"distribution" defaultValue:@"fill"];
  [self initializeProperty:@"alignment" defaultValue:@"fill"];
  [self initializeProperty:@"spacing" defaultValue:NUMINT(0)];
  [self initializeProperty:@"layoutMarginsRelativeArrangement" defaultValue:NUMBOOL(NO)];
  [super _initWithProperties:properties];
}

- (void)addArrangedSubview:(id)args
{
  ENSURE_SINGLE_ARG(args, TiViewProxy);
  [self makeViewPerformSelector:@selector(addArrangedSubview:)
                     withObject:args
                 createIfNeeded:YES
                  waitUntilDone:NO];
}

- (void)removeArrangedSubview:(id)args
{
  ENSURE_SINGLE_ARG(args, TiViewProxy);
  [self makeViewPerformSelector:@selector(removeArrangedSubview:)
                     withObject:args
                 createIfNeeded:NO
                  waitUntilDone:NO];
}

- (void)insertArrangedSubview:(id)args
{
  ENSURE_ARG_COUNT(args, 2);
  TiViewProxy *viewProxy = [args objectAtIndex:0];
  NSNumber *index = [args objectAtIndex:1];

  ENSURE_TYPE(viewProxy, TiViewProxy);
  ENSURE_TYPE(index, NSNumber);

  NSDictionary *params = @{
    @"view" : viewProxy,
    @"index" : index
  };

  [self makeViewPerformSelector:@selector(insertArrangedSubview:)
                     withObject:params
                 createIfNeeded:YES
                  waitUntilDone:NO];
}

- (void)setCustomSpacing:(id)args
{
  ENSURE_ARG_COUNT(args, 2);
  NSNumber *spacing = [args objectAtIndex:0];
  TiViewProxy *afterViewProxy = [args objectAtIndex:1];

  ENSURE_TYPE(spacing, NSNumber);
  ENSURE_TYPE(afterViewProxy, TiViewProxy);

  [self makeViewPerformSelector:@selector(setCustomSpacing:)
                     withObject:args
                 createIfNeeded:NO
                  waitUntilDone:NO];
}

@end

#endif