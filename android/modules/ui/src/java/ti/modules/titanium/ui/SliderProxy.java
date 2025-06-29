/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.ui;

import android.app.Activity;

import org.appcelerator.kroll.annotations.Kroll;
import org.appcelerator.titanium.TiC;
import org.appcelerator.titanium.proxy.TiViewProxy;
import org.appcelerator.titanium.view.TiUIView;

import ti.modules.titanium.ui.widget.TiUISlider;

@Kroll.proxy(creatableInModule = UIModule.class,
	propertyAccessors = {
		"min",
		"max",
		"minRange",
		"maxRange",
		"thumbImage",
		"thumbSize",
		TiC.PROPERTY_SPLIT_TRACK,
		"leftTrackImage",
		"rightTrackImage",
		TiC.PROPERTY_TINT_COLOR,
		TiC.PROPERTY_TRACK_TINT_COLOR,
		TiC.PROPERTY_VALUE,
		"steps",
		"stepValues"
	})
public class SliderProxy extends TiViewProxy
{
	public SliderProxy()
	{
		super();
		defaultValues.put(TiC.PROPERTY_SPLIT_TRACK, false);
	}

	@Override
	public TiUIView createView(Activity activity)
	{
		return new TiUISlider(this);
	}

	@Override
	public String getApiName()
	{
		return "Ti.UI.Slider";
	}
}
