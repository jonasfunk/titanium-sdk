/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
#ifdef USE_TI_UISLIDER

#import "TiUISlider.h"
#import "TiUISliderProxy.h"
#import <TitaniumKit/ImageLoader.h>
#import <TitaniumKit/TiUtils.h>

@implementation TiUISlider

#ifdef TI_USE_AUTOLAYOUT
- (void)initializeTiLayoutView
{
  [super initializeTiLayoutView];
  [self setDefaultHeight:TiDimensionAutoSize];
  [self setDefaultWidth:TiDimensionAutoFill];
}
#endif

- (void)dealloc
{
  [sliderView removeTarget:self action:@selector(sliderChanged:) forControlEvents:UIControlEventValueChanged];
  [sliderView removeTarget:self action:@selector(sliderBegin:) forControlEvents:UIControlEventTouchDown];
  [sliderView removeTarget:self action:@selector(sliderEnd:) forControlEvents:(UIControlEventTouchUpInside | UIControlEventTouchUpOutside | UIControlEventTouchCancel)];
  RELEASE_TO_NIL(sliderView);
  RELEASE_TO_NIL(lastTouchUp);
  RELEASE_TO_NIL(steps);
  [super dealloc];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [sliderView setFrame:[self bounds]];
}

- (UISlider *)sliderView
{
  if (sliderView == nil) {
    sliderView = [[UISlider alloc] initWithFrame:[self bounds]];

    // We have to do this to force the slider subviews to appear, in the case where value<=min==0.
    // If the slider doesn't register a value change (or already have its subviews drawn in a nib) then
    // it will NEVER draw them.
    [sliderView setValue:0.1 animated:NO];
    [sliderView setValue:0 animated:NO];

    [sliderView addTarget:self action:@selector(sliderChanged:) forControlEvents:UIControlEventValueChanged];
    [sliderView addTarget:self action:@selector(sliderBegin:) forControlEvents:UIControlEventTouchDown];
    [sliderView addTarget:self action:@selector(sliderEnd:) forControlEvents:(UIControlEventTouchUpInside | UIControlEventTouchUpOutside | UIControlEventTouchCancel)];
    [self addSubview:sliderView];
    lastTouchUp = [[NSDate alloc] init];
    lastTimeInterval = 1.0; // Short-circuit so that we don't ignore the first fire

    thumbImageState = UIControlStateNormal;
    leftTrackImageState = UIControlStateNormal;
    rightTrackImageState = UIControlStateNormal;

    // ✅ Initialize lastFiredValue
    lastFiredValue = NAN;
  }
  return sliderView;
}

- (id)accessibilityElement
{
  return [self sliderView];
}

- (BOOL)hasTouchableListener
{
  // since this guy only works with touch events, we always want them
  // just always return YES no matter what listeners we have registered
  return YES;
}

- (void)setThumb:(id)value forState:(UIControlState)state
{
  [[self sliderView] setThumbImage:[TiUtils image:value proxy:[self proxy]] forState:state];
}

- (void)setRightTrack:(id)value forState:(UIControlState)state
{
  NSURL *url = [TiUtils toURL:value proxy:[self proxy]];
  if (url == nil) {
    DebugLog(@"[WARN] could not find image: %@", [url absoluteString]);
    return;
  }

  UIImage *ret = [[ImageLoader sharedLoader] loadImmediateStretchableImage:url withLeftCap:rightTrackLeftCap topCap:rightTrackTopCap];

  [[self sliderView] setMaximumTrackImage:ret forState:state];
}

- (void)setLeftTrack:(id)value forState:(UIControlState)state
{
  NSURL *url = [TiUtils toURL:value proxy:[self proxy]];
  if (url == nil) {
    DebugLog(@"[WARN] could not find image: %@", [url absoluteString]);
    return;
  }

  UIImage *ret = [[ImageLoader sharedLoader] loadImmediateStretchableImage:url withLeftCap:leftTrackLeftCap topCap:leftTrackTopCap];

  [[self sliderView] setMinimumTrackImage:ret forState:state];
}

#pragma mark View controller stuff

- (void)setThumbImage_:(id)value
{
  [self setThumb:value forState:UIControlStateNormal];

  if ((thumbImageState & UIControlStateSelected) == 0) {
    [self setThumb:value forState:UIControlStateSelected];
  }
  if ((thumbImageState & UIControlStateHighlighted) == 0) {
    [self setThumb:value forState:UIControlStateHighlighted];
  }
  if ((thumbImageState & UIControlStateDisabled) == 0) {
    [self setThumb:value forState:UIControlStateDisabled];
  }
}

- (void)setSelectedThumbImage_:(id)value
{
  [self setThumb:value forState:UIControlStateSelected];
  thumbImageState = thumbImageState | UIControlStateSelected;
}

- (void)setHighlightedThumbImage_:(id)value
{
  [self setThumb:value forState:UIControlStateHighlighted];
  thumbImageState = thumbImageState | UIControlStateHighlighted;
}

- (void)setDisabledThumbImage_:(id)value
{
  [self setThumb:value forState:UIControlStateDisabled];
  thumbImageState = thumbImageState | UIControlStateSelected;
}

- (void)setLeftTrackImage_:(id)value
{
  [self setLeftTrack:value forState:UIControlStateNormal];

  if ((leftTrackImageState & UIControlStateSelected) == 0) {
    [self setLeftTrack:value forState:UIControlStateSelected];
  }
  if ((leftTrackImageState & UIControlStateHighlighted) == 0) {
    [self setLeftTrack:value forState:UIControlStateHighlighted];
  }
  if ((leftTrackImageState & UIControlStateDisabled) == 0) {
    [self setLeftTrack:value forState:UIControlStateDisabled];
  }
}

- (void)setSelectedLeftTrackImage_:(id)value
{
  [self setLeftTrack:value forState:UIControlStateSelected];
  leftTrackImageState = leftTrackImageState | UIControlStateSelected;
}

- (void)setHighlightedLeftTrackImage_:(id)value
{
  [self setLeftTrack:value forState:UIControlStateHighlighted];
  leftTrackImageState = leftTrackImageState | UIControlStateHighlighted;
}

- (void)setDisabledLeftTrackImage_:(id)value
{
  [self setLeftTrack:value forState:UIControlStateDisabled];
  leftTrackImageState = leftTrackImageState | UIControlStateDisabled;
}

- (void)setRightTrackImage_:(id)value
{
  [self setRightTrack:value forState:UIControlStateNormal];

  if ((rightTrackImageState & UIControlStateSelected) == 0) {
    [self setRightTrack:value forState:UIControlStateSelected];
  }
  if ((rightTrackImageState & UIControlStateHighlighted) == 0) {
    [self setRightTrack:value forState:UIControlStateHighlighted];
  }
  if ((rightTrackImageState & UIControlStateDisabled) == 0) {
    [self setRightTrack:value forState:UIControlStateDisabled];
  }
}

- (void)setSelectedRightTrackImage_:(id)value
{
  [self setRightTrack:value forState:UIControlStateSelected];
  rightTrackImageState = rightTrackImageState | UIControlStateSelected;
}

- (void)setHighlightedRightTrackImage_:(id)value
{
  [self setRightTrack:value forState:UIControlStateHighlighted];
  rightTrackImageState = rightTrackImageState | UIControlStateHighlighted;
}

- (void)setDisabledRightTrackImage_:(id)value
{
  [self setRightTrack:value forState:UIControlStateDisabled];
  rightTrackImageState = rightTrackImageState | UIControlStateDisabled;
}

- (void)setLeftTrackLeftCap_:(id)value
{
  leftTrackLeftCap = TiDimensionFromObject(value);
}
- (void)setLeftTrackTopCap_:(id)value
{
  leftTrackTopCap = TiDimensionFromObject(value);
}
- (void)setRightTrackLeftCap_:(id)value
{
  rightTrackLeftCap = TiDimensionFromObject(value);
}
- (void)setRightTrackTopCap_:(id)value
{
  rightTrackTopCap = TiDimensionFromObject(value);
}

- (void)setMin_:(id)value
{
  [[self sliderView] setMinimumValue:[TiUtils floatValue:value]];
}

- (void)setMax_:(id)value
{
  [[self sliderView] setMaximumValue:[TiUtils floatValue:value]];
}

- (void)_setValue:(id)value
{
  if ([value isKindOfClass:[NSNumber class]]) {
    [[self sliderView] setValue:[TiUtils floatValue:value] animated:NO];
  } else if ([value isKindOfClass:[NSArray class]]) {
    CGFloat newValue = [TiUtils floatValue:[value objectAtIndex:0]];
    NSDictionary *properties = (NSDictionary *)[value objectAtIndex:1];

    [[self sliderView] setValue:newValue animated:[TiUtils boolValue:@"animated" properties:properties def:NO]];
  }

  [self sliderChanged:[self sliderView] isTrusted:NO];
}

- (void)setEnabled_:(id)value
{
  [[self sliderView] setEnabled:[TiUtils boolValue:value]];
}

- (void)setTrackTintColor_:(id)value
{
  UIColor *newColor = [[TiUtils colorValue:value] _color];
  [[self sliderView] setMaximumTrackTintColor:newColor];
}

// ✅ Add steps support for iOS
- (void)setSteps_:(id)value
{
  if (value == nil) {
    RELEASE_TO_NIL(steps);
    snapToSteps = NO;
    return;
  }

  if ([value isKindOfClass:[NSArray class]]) {
    // Array of specific step values
    NSArray *stepArray = (NSArray *)value;
    NSMutableArray *stepValues = [NSMutableArray arrayWithCapacity:[stepArray count]];

    for (id stepValue in stepArray) {
      [stepValues addObject:[NSNumber numberWithFloat:[TiUtils floatValue:stepValue]]];
    }

    // Sort steps array to ensure proper ordering
    [stepValues sortUsingComparator:^NSComparisonResult(NSNumber *a, NSNumber *b) {
      return [a compare:b];
    }];

    RELEASE_TO_NIL(steps);
    steps = [[NSArray arrayWithArray:stepValues] retain];
    snapToSteps = [steps count] > 0;

  } else if ([value isKindOfClass:[NSNumber class]]) {
    // Count of equal steps to divide the range
    int stepCount = [TiUtils intValue:value];
    if (stepCount > 1) {
      NSMutableArray *stepValues = [NSMutableArray arrayWithCapacity:stepCount];
      float minValue = [[self sliderView] minimumValue];
      float maxValue = [[self sliderView] maximumValue];
      float range = maxValue - minValue;

      for (int i = 0; i < stepCount; i++) {
        float stepValue = minValue + (range * i / (stepCount - 1));
        [stepValues addObject:[NSNumber numberWithFloat:stepValue]];
      }

      RELEASE_TO_NIL(steps);
      steps = [[NSArray arrayWithArray:stepValues] retain];
      snapToSteps = YES;
    } else {
      NSLog(@"[WARN] Step count must be greater than 1");
      RELEASE_TO_NIL(steps);
      snapToSteps = NO;
    }
  } else {
    NSLog(@"[WARN] Steps property must be an array of numbers or a step count number");
    RELEASE_TO_NIL(steps);
    snapToSteps = NO;
  }
}

- (float)findNearestStep:(float)value
{
  if (!snapToSteps || steps == nil || [steps count] == 0) {
    return value;
  }

  float nearestStep = [[steps objectAtIndex:0] floatValue];
  float minDistance = fabsf(value - nearestStep);

  for (NSNumber *step in steps) {
    float stepValue = [step floatValue];
    float distance = fabsf(value - stepValue);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStep = stepValue;
    }
  }

  return nearestStep;
}

- (CGFloat)verifyHeight:(CGFloat)suggestedHeight
{
  CGFloat result = [[self sliderView] sizeThatFits:CGSizeZero].height;

  // IOS7 DP3 sizeThatFits always returns zero for regular slider
  if (result == 0) {
    result = 30.0;
  }
  return result;
}

USE_PROXY_FOR_VERIFY_AUTORESIZING

#pragma mark Delegates

- (void)sliderChanged:(id)sender
{
  [self sliderChanged:sender isTrusted:YES];
}

- (void)sliderChanged:(id)sender isTrusted:(BOOL)isTrusted
{
  UISlider *slider = (UISlider *)sender;
  float currentValue = [slider value];

  // ✅ Apply snapping if steps are enabled and this is user input
  if (snapToSteps && isTrusted) {
    float snappedValue = [self findNearestStep:currentValue];
    if (fabsf(currentValue - snappedValue) > 0.001f) {
      // Need to snap to different value
      [slider setValue:snappedValue animated:NO];
      currentValue = snappedValue;
    }
  }

  // ✅ Only fire change event if value actually changed from last fired value
  BOOL shouldFireEvent = isnan(lastFiredValue) || fabsf(currentValue - lastFiredValue) > 0.001f;

  if (shouldFireEvent) {
    lastFiredValue = currentValue;

    // ✅ Determine the value to return - step index or actual value
    float returnValue = currentValue;
    if (stepValues && snapToSteps) {
      returnValue = [self findNearestStepIndex:currentValue];
    }

    NSNumber *newValue = [NSNumber numberWithFloat:returnValue];
    [self.proxy replaceValue:newValue forKey:@"value" notification:NO];

    if ([self.proxy _hasListeners:@"change"]) {
      [self.proxy fireEvent:@"change" withObject:[NSDictionary dictionaryWithObjectsAndKeys:newValue, @"value", NUMBOOL(isTrusted), @"isTrusted", nil]];
    }
  }
}

- (void)sliderBegin:(id)sender
{
  NSNumber *newValue = [NSNumber numberWithFloat:[(UISlider *)sender value]];
  if ([[self proxy] _hasListeners:@"touchstart"]) {
    [[self proxy] fireEvent:@"touchstart" withObject:[NSDictionary dictionaryWithObject:newValue forKey:@"value"]];
  }
  if ([[self proxy] _hasListeners:@"start"]) {
    [[self proxy] fireEvent:@"start" withObject:[NSDictionary dictionaryWithObject:newValue forKey:@"value"] propagate:NO reportSuccess:NO errorCode:0 message:nil];
  }
}

- (void)sliderEnd:(id)sender
{
  // APPLE BUG: Sometimes in a double-click our 'UIControlEventTouchUpInside' event is fired more than once.  This is
  // ALWAYS indicated by a sub-0.1s difference between the clicks, and results in an additional fire of the event.
  // We have to track the PREVIOUS (not current) inverval and prevent these ugly misfires!

  NSDate *now = [[NSDate alloc] init];
  NSTimeInterval currentTimeInterval = [now timeIntervalSinceDate:lastTouchUp];
  if (!(lastTimeInterval < 0.1 && currentTimeInterval < 0.1)) {
    NSNumber *newValue = [NSNumber numberWithFloat:[(UISlider *)sender value]];
    if ([[self proxy] _hasListeners:@"touchend"]) {
      [[self proxy] fireEvent:@"touchend" withObject:[NSDictionary dictionaryWithObject:newValue forKey:@"value"]];
    }
    if ([[self proxy] _hasListeners:@"stop"]) {
      [[self proxy] fireEvent:@"stop" withObject:[NSDictionary dictionaryWithObject:newValue forKey:@"value"] propagate:NO reportSuccess:NO errorCode:0 message:nil];
    }
  }
  lastTimeInterval = currentTimeInterval;
  RELEASE_TO_NIL(lastTouchUp);
  lastTouchUp = now;
}

// ✅ Add stepValues property support
- (void)setStepValues_:(id)value
{
  stepValues = [TiUtils boolValue:value def:NO];
}

- (int)findNearestStepIndex:(float)value
{
  if (!snapToSteps || steps == nil || [steps count] == 0) {
    return 0;
  }

  int nearestIndex = 0;
  float minDistance = fabsf(value - [[steps objectAtIndex:0] floatValue]);

  for (int i = 1; i < [steps count]; i++) {
    float stepValue = [[steps objectAtIndex:i] floatValue];
    float distance = fabsf(value - stepValue);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

@end

#endif
