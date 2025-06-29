/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

#ifdef USE_TI_UISTACKVIEW

#import "TiUIStackView.h"
#import "TiUtils.h"
#import "TiViewProxy.h"

@implementation TiUIStackView

- (id)init
{
  if (self = [super init]) {
    // iOS 10+ - Direct UIStackView usage
    _stackView = [[UIStackView alloc] init];
    _stackView.axis = UILayoutConstraintAxisVertical;
    _stackView.distribution = UIStackViewDistributionFill;
    _stackView.alignment = UIStackViewAlignmentFill;
    _stackView.spacing = 0;

    [self addSubview:_stackView];

    // Auto Layout constraints to fill the container
    _stackView.translatesAutoresizingMaskIntoConstraints = NO;
    [NSLayoutConstraint activateConstraints:@[
      [_stackView.topAnchor constraintEqualToAnchor:self.topAnchor],
      [_stackView.leadingAnchor constraintEqualToAnchor:self.leadingAnchor],
      [_stackView.trailingAnchor constraintEqualToAnchor:self.trailingAnchor],
      [_stackView.bottomAnchor constraintEqualToAnchor:self.bottomAnchor]
    ]];
  }
  return self;
}

- (void)dealloc
{
  RELEASE_TO_NIL(_stackView);
  [super dealloc];
}

#pragma mark - StackView Methods

- (void)addArrangedSubview:(TiViewProxy *)viewProxy
{
  if (viewProxy == nil) {
    return;
  }

  TiUIView *tiView = [viewProxy view];
  [_stackView addArrangedSubview:tiView];

  DebugLog(@"[DEBUG] Added arranged subview: %@", [viewProxy apiName]);
}

- (void)removeArrangedSubview:(TiViewProxy *)viewProxy
{
  if (viewProxy == nil) {
    return;
  }

  TiUIView *tiView = [viewProxy view];
  if (tiView != nil) {
    [_stackView removeArrangedSubview:tiView];
    [tiView removeFromSuperview];
  }

  DebugLog(@"[DEBUG] Removed arranged subview: %@", [viewProxy apiName]);
}

- (void)insertArrangedSubview:(NSDictionary *)params
{
  TiViewProxy *viewProxy = [params objectForKey:@"view"];
  NSInteger index = [[params objectForKey:@"index"] integerValue];

  if (viewProxy == nil) {
    return;
  }

  // Clamp index to valid range
  NSInteger maxIndex = [_stackView.arrangedSubviews count];
  index = MAX(0, MIN(index, maxIndex));

  TiUIView *tiView = [viewProxy view];
  [_stackView insertArrangedSubview:tiView atIndex:index];

  DebugLog(@"[DEBUG] Inserted arranged subview at index %ld: %@", (long)index, [viewProxy apiName]);
}

- (void)setCustomSpacing:(NSArray *)args
{
  // iOS 11+ feature
  if (@available(iOS 11.0, *)) {
    CGFloat spacing = [[args objectAtIndex:0] floatValue];
    TiViewProxy *afterViewProxy = [args objectAtIndex:1];

    if (afterViewProxy != nil) {
      TiUIView *afterView = [afterViewProxy view];
      if (afterView != nil) {
        [_stackView setCustomSpacing:spacing afterView:afterView];
        DebugLog(@"[DEBUG] Set custom spacing %.1f after view: %@", spacing, [afterViewProxy apiName]);
      }
    }
  } else {
    DebugLog(@"[WARN] setCustomSpacing requires iOS 11.0 or later");
  }
}

#pragma mark - Property Setters

- (void)setAxis_:(id)value
{
  NSString *axisString = [TiUtils stringValue:value];

  if ([axisString isEqualToString:@"horizontal"]) {
    _stackView.axis = UILayoutConstraintAxisHorizontal;
  } else {
    _stackView.axis = UILayoutConstraintAxisVertical;
  }

  DebugLog(@"[DEBUG] Set axis to: %@", axisString);
}

- (void)setDistribution_:(id)value
{
  NSString *distributionString = [TiUtils stringValue:value];

  if ([distributionString isEqualToString:@"fillEqually"]) {
    _stackView.distribution = UIStackViewDistributionFillEqually;
  } else if ([distributionString isEqualToString:@"fillProportionally"]) {
    _stackView.distribution = UIStackViewDistributionFillProportionally;
  } else if ([distributionString isEqualToString:@"equalSpacing"]) {
    _stackView.distribution = UIStackViewDistributionEqualSpacing;
  } else if ([distributionString isEqualToString:@"equalCentering"]) {
    _stackView.distribution = UIStackViewDistributionEqualCentering;
  } else {
    _stackView.distribution = UIStackViewDistributionFill;
  }

  DebugLog(@"[DEBUG] Set distribution to: %@", distributionString);
}

- (void)setAlignment_:(id)value
{
  NSString *alignmentString = [TiUtils stringValue:value];

  if ([alignmentString isEqualToString:@"leading"]) {
    _stackView.alignment = UIStackViewAlignmentLeading;
  } else if ([alignmentString isEqualToString:@"center"]) {
    _stackView.alignment = UIStackViewAlignmentCenter;
  } else if ([alignmentString isEqualToString:@"trailing"]) {
    _stackView.alignment = UIStackViewAlignmentTrailing;
  } else if ([alignmentString isEqualToString:@"firstBaseline"]) {
    _stackView.alignment = UIStackViewAlignmentFirstBaseline;
  } else if ([alignmentString isEqualToString:@"lastBaseline"]) {
    _stackView.alignment = UIStackViewAlignmentLastBaseline;
  } else {
    _stackView.alignment = UIStackViewAlignmentFill;
  }

  DebugLog(@"[DEBUG] Set alignment to: %@", alignmentString);
}

- (void)setSpacing_:(id)value
{
  CGFloat spacing = [TiUtils floatValue:value];
  _stackView.spacing = spacing;

  DebugLog(@"[DEBUG] Set spacing to: %.1f", spacing);
}

- (void)setLayoutMargins_:(id)value
{
  NSDictionary *margins = [TiUtils dictionaryValue:value];
  if (margins == nil) {
    return;
  }

  UIEdgeInsets insets = UIEdgeInsetsMake(
      [TiUtils floatValue:[margins objectForKey:@"top"]
                      def:0],
      [TiUtils floatValue:[margins objectForKey:@"left"]
                      def:0],
      [TiUtils floatValue:[margins objectForKey:@"bottom"]
                      def:0],
      [TiUtils floatValue:[margins objectForKey:@"right"]
                      def:0]);

  _stackView.layoutMargins = insets;

  DebugLog(@"[DEBUG] Set layout margins: %.1f,%.1f,%.1f,%.1f",
      insets.top, insets.left, insets.bottom, insets.right);
}

- (void)setLayoutMarginsRelativeArrangement_:(id)value
{
  BOOL enabled = [TiUtils boolValue:value];
  _stackView.layoutMarginsRelativeArrangement = enabled;

  DebugLog(@"[DEBUG] Set layoutMarginsRelativeArrangement to: %@", enabled ? @"YES" : @"NO");
}

@end

#endif