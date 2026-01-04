import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MonthlyCalendar({ 
  monthlyData, 
  theme, 
  t, 
  selectedDate, 
  onDateSelect,
  currentMonth,
  onMonthChange 
}) {
  const year = currentMonth.year;
  const month = currentMonth.month;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Get day of week (0 = Sunday, convert to 0 = Monday)
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  // Create array of all days
  const days = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    // Format date in LOCAL timezone, not UTC
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = monthlyData.find(d => d.date === dateStr);
    days.push({
      day,
      date: dateStr,
      mealsCount: dayData?.mealsCount || 0,
      hasData: dayData?.hasData || false,
    });
  }

  return (
    <View style={styles.container}>
      {/* Month/Year Header with Navigation */}
      <View style={styles.monthNavigationContainer}>
        <TouchableOpacity 
          onPress={() => {
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            
            // Don't go before November 2025
            if (prevYear < 2025 || (prevYear === 2025 && prevMonth < 10)) {
              return; // Can't go back further
            }
            
            onMonthChange({ year: prevYear, month: prevMonth });
          }}
          disabled={year === 2025 && month === 10} // Disable if November 2025
          style={[
            styles.monthNavButton,
            (year === 2025 && month === 10) && { opacity: 0.3 }
          ]}
        >
          <Text style={[styles.monthNavText, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        
        <Text style={[styles.monthHeader, { color: theme.text }]}>
          {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        
        <TouchableOpacity 
          onPress={() => {
            const now = new Date();
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            
            // Don't go beyond current month
            if (nextYear > now.getFullYear() || 
                (nextYear === now.getFullYear() && nextMonth > now.getMonth())) {
              return;
            }
            
            onMonthChange({ year: nextYear, month: nextMonth });
          }}
          disabled={
            year === new Date().getFullYear() && month === new Date().getMonth()
          }
          style={[
            styles.monthNavButton,
            (year === new Date().getFullYear() && month === new Date().getMonth()) && { opacity: 0.3 }
          ]}
        >
          <Text style={[styles.monthNavText, { color: theme.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.calendarHeader}>
        {t('stats.weekdays').map((day, index) => (
          <Text key={index} style={[styles.calendarHeaderText, { color: theme.textTertiary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((dayData, index) => {
          if (!dayData) {
            return <View key={`empty-${index}`} style={styles.calendarCell} />;
          }
          
          // Calculate intensity
          let intensity = 0;
          if (dayData.mealsCount >= 3) intensity = 1;
          else if (dayData.mealsCount >= 1) intensity = 0.6;
          
          const bgColor = dayData.mealsCount > 0
            ? `${theme.primary}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
            : theme.border;
          
          // Check if it's the selected date
          const isSelected = dayData.date === selectedDate;

          // Check if it's a future date (LOCAL timezone)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const cellDate = new Date(year, month, dayData.day);
          cellDate.setHours(0, 0, 0, 0);
          const isFuture = cellDate > today;

          // Debug logging
          if (dayData.day === 12 || dayData.day === 13) {
            console.log(`Day ${dayData.day}: dayData.date="${dayData.date}", todayStr="${todayStr}", isToday=${dayData.date === todayStr}`);
          }

          const isToday = dayData.date === todayStr;
          
          return (
            <TouchableOpacity
              key={dayData.date}
              style={styles.calendarCell}
              onPress={() => !isFuture && onDateSelect(dayData.date)}
              activeOpacity={isFuture ? 1 : 0.7}
              disabled={isFuture}
            >
              <View
                style={[
                  styles.calendarCellInner,
                  { backgroundColor: bgColor },
                  isSelected && { 
                    borderWidth: 2, 
                    borderColor: theme.primary,
                    transform: [{ scale: 1.1 }],
                  },
                  isFuture && { opacity: 0.3 },
                ]}
              >
                <Text style={[
                  styles.calendarDayNumber,
                  { color: dayData.mealsCount > 0 ? '#fff' : theme.textTertiary },
                  isSelected && { fontWeight: 'bold' }
                ]}>
                  {dayData.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.border }]} />
          <Text style={[styles.legendText, { color: theme.textTertiary }]}>
            {t('stats.noMeals')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: `${theme.primary}99` }]} />
          <Text style={[styles.legendText, { color: theme.textTertiary }]}>
            {t('stats.oneTwoMeals')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.textTertiary }]}>
            {t('stats.threePlusMeals')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarHeaderText: {
    flexBasis: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    flexBasis: '14.2857%',
    aspectRatio: 1,
    padding: '1%',
  },
  calendarCellInner: {
    flex: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
  },
  legendText: {
    fontSize: 11,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
monthNavigationContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 15,
  paddingHorizontal: 10,
},
monthNavButton: {
  padding: 10,
  minWidth: 40,
  alignItems: 'center',
},
monthNavText: {
  fontSize: 24,
  fontWeight: 'bold',
},
});